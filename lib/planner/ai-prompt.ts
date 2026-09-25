import { getCategory } from "@/lib/spots/categories";
import { DAY_COUNTS, DURATION_LABELS } from "./duration";
import {
  MAX_CANDIDATES,
  MAX_DAY_SPOTS,
  MIN_DAY_SPOTS,
  type PlannableArea,
} from "./generate";
import { findNearbyAreas } from "./nearby";
import type { PlanRequest } from "./types";

// Gemini に渡すプロンプト（#18）。Supabase も Gemini も呼ばない純粋な関数

/** 候補にできる地域（1日目の地域）の範囲。docs/spec.md のデータ-2 */
export type PlanScope = {
  /** 選ばれた地域。「おまかせ」なら undefined */
  selected?: PlannableArea;
  /** 候補の1日目にできる地域。選ばれた地域があれば、その地域と 80km 以内の近い地域（近い順） */
  bases: PlannableArea[];
};

export function getPlanScope(
  areas: readonly PlannableArea[],
  request: PlanRequest,
): PlanScope {
  const selected = areas.find((area) => area.id === request.areaId);
  const bases = selected
    ? [selected, ...findNearbyAreas(selected, areas)]
    : [...areas];
  return {
    selected,
    bases: bases.filter((area) => area.spots.length >= MIN_DAY_SPOTS),
  };
}

export type PlanPrompt = {
  systemInstruction: string;
  contents: string;
  /** プロンプトで使った記号（A1・S1 など）から、本当の id を引く表 */
  areaIdByKey: Map<string, string>;
  spotIdByKey: Map<string, string>;
};

const SYSTEM_INSTRUCTION = `あなたは、日本各地の地元の人しか知らない穴場に詳しい旅のプランナーです。
渡された「地域」と「スポット」の一覧だけを使って、旅の条件に合う旅の候補を作ります。

守ること:
- 一覧にない地域・スポットを作らない。地域とスポットは、一覧の記号（A1・S1 など）で答える
- 1日の経路は、1つの地域のスポットだけで組む。その日の areaId と、その日のスポットの地域を必ずそろえる
- 1つの候補の中で、同じスポットを2回使わない
- 経路は、実際にめぐりやすい順（近いものから順に）に並べる
- 興味のあることに合うスポットを優先し、だれと・移動手段にも合うように選ぶ（例: 家族（子連れ）なら子どもと楽しめる場所、自転車なら近い場所どうし）
- title・summary・reason は日本語で書く。一覧の記号（A1・S1 など）は書かず、地域名・スポット名で書く
- スポットの説明にないことを事実のように書かない`;

/**
 * 旅の条件と、使ってよい地域・スポットからプロンプトを作る。
 * 長い uuid の代わりに短い記号を使い、トークン数と書き間違いを減らす
 */
export function buildPlanPrompt(
  areas: readonly PlannableArea[],
  request: PlanRequest,
): PlanPrompt {
  const { selected, bases } = getPlanScope(areas, request);
  const dayCount = DAY_COUNTS[request.duration];

  // 候補の地域と、2日目以降に使えるその近い地域だけを渡す
  const included = new Set(bases.map((area) => area.id));
  if (dayCount > 1) {
    for (const base of bases) {
      for (const near of findNearbyAreas(base, areas)) included.add(near.id);
    }
  }
  const promptAreas = areas.filter(
    (area) => included.has(area.id) && area.spots.length > 0,
  );

  const areaKey = new Map(promptAreas.map((area, i) => [area.id, `A${i + 1}`]));
  const areaIdByKey = new Map([...areaKey].map(([id, key]) => [key, id]));
  const spotIdByKey = new Map<string, string>();
  const spotLines: string[] = [];
  for (const area of promptAreas) {
    for (const spot of area.spots) {
      const key = `S${spotIdByKey.size + 1}`;
      spotIdByKey.set(key, spot.id);
      spotLines.push(
        [
          `${key} ${areaKey.get(area.id)} ${spot.name}`,
          getCategory(spot.category).label,
          spot.rating !== null ? `評価${spot.rating}` : null,
          spot.stay_minutes !== null ? `滞在${spot.stay_minutes}分` : null,
          spot.tags.length > 0 ? `タグ: ${spot.tags.join("・")}` : null,
          spot.catchphrase,
        ]
          .filter(Boolean)
          .join("｜"),
      );
    }
  }

  const areaLines = promptAreas.map((area) => {
    const near = findNearbyAreas(area, promptAreas)
      .map((a) => areaKey.get(a.id))
      .join("・");
    return [
      `${areaKey.get(area.id)} ${area.name}`,
      area.catchphrase,
      near ? `近い地域: ${near}` : "近い地域: なし",
    ]
      .filter(Boolean)
      .join("｜");
  });

  const baseKeys = bases.map((area) => areaKey.get(area.id)).join("・");
  // 「最大3件」と書くと1件しか返さないことがあるので、作れる件数をはっきり伝える
  const expected = Math.min(MAX_CANDIDATES, bases.length);
  const candidateRules = selected
    ? [
        `- 1件目の1日目は、必ず ${areaKey.get(selected.id)}（${selected.name}）にする`,
        `- 2件目以降の1日目は、${areaKey.get(selected.id)} の近い地域（${
          bases
            .slice(1)
            .map((area) => areaKey.get(area.id))
            .join("・") || "なし"
        }）から、近い順を優先して選ぶ`,
      ]
    : [`- 1日目の地域は、条件に合うスポットが多い地域から選ぶ（${baseKeys}）`];

  const contents = `# 旅の条件
- エリア: ${selected ? `${selected.name}（${areaKey.get(selected.id)}）` : "おまかせ"}
- 日程: ${DURATION_LABELS[request.duration]}（${dayCount}日）
- 興味のあること: ${request.interests.length > 0 ? request.interests.join("、") : "指定なし"}
- だれと: ${request.companion}
- 移動手段: ${request.transport}

# 候補の作り方
- 候補はちょうど${expected}件作る。候補ごとに1日目の地域を変える
${candidateRules.join("\n")}
- days はちょうど${dayCount}日分。1日のスポットは${MIN_DAY_SPOTS}〜${MAX_DAY_SPOTS}件（なるべく3件以上）
${
  dayCount > 1
    ? "- 2日目以降は、1日目の地域の残りのスポットを優先する。足りなければ、1日目の地域の「近い地域」のスポットを使う\n"
    : ""
}- スポットが足りず、どうしても経路を組めない地域だけは省いてよい

# 地域
${areaLines.join("\n")}

# スポット
${spotLines.join("\n")}`;

  return {
    systemInstruction: SYSTEM_INSTRUCTION,
    contents,
    areaIdByKey,
    spotIdByKey,
  };
}
