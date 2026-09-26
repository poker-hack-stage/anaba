import type { Area } from "@/lib/data/areas";
import type { Spot } from "@/lib/data/spots";
import type { SpotCategory } from "@/lib/spots/categories";
import { compareByHiddenGemScore, compareByRating } from "@/lib/spots/score";
import { calcDayMinutes, DAY_COUNTS, DURATION_LABELS } from "./duration";
import {
  canInclude,
  findIncludedSpot,
  type IncludedSpot,
} from "./include-spot";
import { findNearbyAreas } from "./nearby";
import { matchesNoteHints, type NoteHints, readNoteHints } from "./note";
import type { PlanCandidate, PlanDay, PlanConditions } from "./types";

/** 候補を作るのに使う地域の列（テストのフィクスチャを短く書けるように、使う列だけにする） */
export type PlannableArea = Pick<
  Area,
  "id" | "name" | "prefecture" | "catchphrase" | "center_lat" | "center_lng"
> & { spots: Spot[] };

/** 興味の選択肢とカテゴリの対応（1対1） */
export const INTEREST_TO_CATEGORY: Record<string, SpotCategory> = {
  食: "gourmet",
  自然: "nature",
  絶景: "view",
  温泉: "onsen",
  体験: "craft",
  歴史: "history",
};

/** 候補の数の上限（1地域につき1候補） */
export const MAX_CANDIDATES = 3;
/** 1日の経路のスポット数の下限と上限 */
export const MIN_DAY_SPOTS = 2;
export const MAX_DAY_SPOTS = 4;
/** 希望に「ゆっくり」「のんびり」があるとき（デモモード、#114）の、1日のスポット数の上限 */
export const RELAXED_DAY_SPOTS = 3;

/**
 * Gemini を使わずに旅プランの候補を作る（デモモード、#19）。Supabase は読まない。
 * 決まりは docs/spec.md のデータ-2・データ-4・画面-2:
 *
 * - 地域の選び方: 「おまかせ」なら、興味に合うスポットの多い地域から最大3つ。
 *   地域を選んだら、1件目はその地域、2・3件目は中心どうしが 80km 以内の地域から近い順に
 * - 1日の経路: 1つの地域のスポット2〜4件。興味に合うカテゴリ → 穴場度 → 評価の順で選び、近い順につなぐ
 * - 2日目以降: 候補の地域に未使用のスポットが2件以上あればその地域、なければ近い地域（80km 以内、近い順）。
 *   近い地域で残りの日をまかなえないときは、残りの日のぶんを候補の地域に残しておく
 * - 1つの候補の中で同じスポットを2回使わない。組めない候補は捨てる
 * - 必ず入れるスポット（includeSpotId、#32）があれば、そのスポットの地域をめぐる日に必ず入れる。
 *   候補の地域と別の地域なら、2日目以降にその地域を優先する。入れられない候補は捨てる
 * - 自由記述の希望（note、#114）は、決まったキーワードだけを反映する（note.ts の readNoteHints()）:
 *   雨・屋内 → 屋内のスポット、子ども・子連れ → 子どもと楽しめるタグのスポットを、興味の次に優先する。
 *   ゆっくり・のんびり → 1日3件まで
 */
export function generateCandidates(
  areas: readonly PlannableArea[],
  request: PlanConditions,
): PlanCandidate[] {
  const wanted = new Set(
    request.interests.map((i) => INTEREST_TO_CATEGORY[i]).filter(Boolean),
  );
  const hints = readNoteHints(request.note);
  const selected = areas.find((area) => area.id === request.areaId);
  const included = findIncludedSpot(areas, request);
  // 見つからないスポットは、どの候補にも入れられない
  if (included === undefined) return [];

  // 候補にする地域の順番。前から組んでいき、組めた順に最大3件
  const bases: { area: PlannableArea; nearby: boolean }[] = selected
    ? [
        { area: selected, nearby: false },
        ...findNearbyAreas(selected, areas).map((area) => ({
          area,
          nearby: true,
        })),
      ]
    : [...areas]
        // sort は安定なので、興味に合うスポットの数が同じなら display_order の順のまま
        .sort((a, b) => countWanted(b, wanted) - countWanted(a, wanted))
        .map((area) => ({ area, nearby: false }));

  const candidates: PlanCandidate[] = [];
  for (const { area, nearby } of bases) {
    if (candidates.length >= MAX_CANDIDATES) break;
    if (included && !canInclude(area, included, areas, request)) continue;
    const candidate = buildCandidate(area, areas, request, wanted, hints, {
      nearbyOf: nearby ? selected : undefined,
      included: included ?? undefined,
    });
    if (candidate) candidates.push(candidate);
  }
  return candidates;
}

function buildCandidate(
  base: PlannableArea,
  areas: readonly PlannableArea[],
  request: PlanConditions,
  wanted: ReadonlySet<SpotCategory>,
  hints: NoteHints,
  { nearbyOf, included }: { nearbyOf?: PlannableArea; included?: IncludedSpot },
): PlanCandidate | null {
  const used = new Set<string>();
  const unused = (area: PlannableArea) =>
    area.spots.filter((spot) => !used.has(spot.id));
  const nearbyAreas = findNearbyAreas(base, areas);

  const days: PlanDay[] = [];
  for (let day = 1; day <= DAY_COUNTS[request.duration]; day++) {
    // 必ず入れるスポットがまだ経路になく、その地域が近い地域なら、2日目以降はその地域を先にめぐる
    const includedArea =
      included &&
      !used.has(included.spot.id) &&
      unused(included.area).length >= MIN_DAY_SPOTS
        ? nearbyAreas.find((a) => a.id === included.area.id)
        : undefined;
    // 1日目は候補の地域。2日目以降は、候補の地域で組めなければ近い地域
    const area =
      day === 1
        ? base
        : (includedArea ??
          (unused(base).length >= MIN_DAY_SPOTS
            ? base
            : nearbyAreas.find((a) => unused(a).length >= MIN_DAY_SPOTS)));
    if (!area || unused(area).length < MIN_DAY_SPOTS) return null;

    // 残りの日を近い地域でまかなえないぶんは、候補の地域に1日2件ずつ残しておく
    // （例: 4件しかなく近い地域もない町の1泊2日を、4件＋0件ではなく2件＋2件で組む）
    const nearbyDays = nearbyAreas.reduce(
      (sum, a) => sum + Math.floor(unused(a).length / MIN_DAY_SPOTS),
      0,
    );
    const reservedDays =
      area === base
        ? Math.max(0, DAY_COUNTS[request.duration] - day - nearbyDays)
        : 0;
    const limit = Math.min(
      hints.relaxed ? RELAXED_DAY_SPOTS : MAX_DAY_SPOTS,
      unused(area).length - reservedDays * MIN_DAY_SPOTS,
    );
    if (limit < MIN_DAY_SPOTS) return null;

    const sorted = [...unused(area)].sort((a, b) =>
      compareForRoute(a, b, wanted, hints),
    );
    let picked = sorted.slice(0, limit);
    // 必ず入れるスポットがこの地域にあり、選んだ中になければ、最後の1件と入れ替える
    const mustPick =
      included && area.id === included.area.id && !used.has(included.spot.id)
        ? sorted.find((s) => s.id === included.spot.id)
        : undefined;
    if (mustPick && !picked.includes(mustPick)) {
      picked = [...picked.slice(0, limit - 1), mustPick];
    }
    const route = orderByProximity(picked);
    for (const spot of route) used.add(spot.id);

    days.push({
      day,
      areaId: area.id,
      areaName: area.name,
      route,
      durationMinutes: calcDayMinutes(route, request.transport),
    });
  }

  if (included && !used.has(included.spot.id)) return null;

  // 経路に使った地域の、経路に入らなかったスポット
  const dayAreaIds = new Set(days.map((d) => d.areaId));
  const otherSpots = areas
    .filter((area) => dayAreaIds.has(area.id))
    .flatMap((area) => unused(area));

  return {
    id: base.id,
    areaName: base.name,
    title: `${base.name}をめぐる${DURATION_LABELS[request.duration]}プラン`,
    summary: base.catchphrase ?? "",
    reason: buildReason(request, days, base, nearbyOf, included, hints),
    duration: request.duration,
    days,
    otherSpots,
    nearby: nearbyOf !== undefined,
  };
}

/**
 * 経路に入れる順。興味に合うカテゴリ → 希望に合うスポット（#114） → 穴場度の高い順 → 評価の高い順 →
 * 名前の順（DB から返る順に左右されないように）。
 * 穴場度・評価がないスポットは後ろ（docs/spot-scores.md）
 */
function compareForRoute(
  a: Spot,
  b: Spot,
  wanted: ReadonlySet<SpotCategory>,
  hints: NoteHints,
): number {
  return (
    Number(wanted.has(b.category as SpotCategory)) -
      Number(wanted.has(a.category as SpotCategory)) ||
    Number(matchesNoteHints(b, hints)) - Number(matchesNoteHints(a, hints)) ||
    compareByHiddenGemScore(a, b) ||
    compareByRating(a, b) ||
    a.name.localeCompare(b.name, "ja")
  );
}

/**
 * 先頭のスポットから、まだ通っていちばん近いスポットを順につなぐ（地図で経路が行ったり来たりしないように）。
 * Gemini の経路にも使う（ai-candidates.ts、#113）
 */
export function orderByProximity(spots: readonly Spot[]): Spot[] {
  if (spots.length === 0) return [];
  const [first, ...rest] = spots;
  const ordered = [first];
  const remaining = [...rest];
  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let nearest = 0;
    for (let i = 1; i < remaining.length; i++) {
      if (
        squaredDistance(last, remaining[i]) <
        squaredDistance(last, remaining[nearest])
      ) {
        nearest = i;
      }
    }
    ordered.push(...remaining.splice(nearest, 1));
  }
  return ordered;
}

/** 同じ地域の中での近さを比べるだけなので、緯度経度の差の2乗で足りる（経度は緯度で縮める） */
function squaredDistance(a: Spot, b: Spot): number {
  const dLat = a.lat - b.lat;
  const dLng = (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180);
  return dLat ** 2 + dLng ** 2;
}

function countWanted(
  area: PlannableArea,
  wanted: ReadonlySet<SpotCategory>,
): number {
  return area.spots.filter((spot) => wanted.has(spot.category as SpotCategory))
    .length;
}

/** 選ばれた理由の定型文（Gemini を使うときは Gemini が書く） */
function buildReason(
  request: PlanConditions,
  days: readonly PlanDay[],
  base: PlannableArea,
  nearbyOf: PlannableArea | undefined,
  included: IncludedSpot | undefined,
  hints: NoteHints,
): string {
  const interests = request.interests.filter((i) => i in INTEREST_TO_CATEGORY);
  const sentences = [
    nearbyOf ? `${nearbyOf.name}の近くの地域から選びました。` : "",
    interests.length > 0
      ? `興味の「${interests.join("・")}」に合うスポットを、穴場度の高い順に選びました。`
      : "穴場度の高いスポットを選びました。",
    ...days
      .filter((d) => d.areaId !== base.id)
      .map((d) => `${d.day}日目は近くの${d.areaName}をめぐります。`),
    included ? `「${included.spot.name}」を経路に加えました。` : "",
    noteSentence(hints),
  ];
  return sentences.join("");
}

/** 希望（#114）のうち、デモモードで反映したことの文。何も反映していなければ空 */
function noteSentence(hints: NoteHints): string {
  const done = [
    hints.indoor ? "屋内で楽しめるスポットを優先しました" : "",
    hints.kids ? "子どもと楽しめるスポットを優先しました" : "",
    hints.relaxed ? `1日${RELAXED_DAY_SPOTS}件までにしました` : "",
  ].filter(Boolean);
  return done.length > 0 ? `希望に合わせて、${done.join("。")}。` : "";
}
