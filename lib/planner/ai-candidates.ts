import type { Spot } from "@/lib/data/spots";
import { getPlanScope, type PlanPrompt } from "./ai-prompt";
import { calcDayMinutes, DAY_COUNTS, DURATION_LABELS } from "./duration";
import {
  MAX_CANDIDATES,
  MAX_DAY_SPOTS,
  MIN_DAY_SPOTS,
  type PlannableArea,
} from "./generate";
import { findNearbyAreas } from "./nearby";
import type { AiPlan } from "./schema";
import type { PlanCandidate, PlanDay, PlanConditions } from "./types";

// Gemini の出力を確かめて、候補（PlanCandidate）の形に戻す（#18）。Gemini の答えは信用せず、ここで決まりを守らせる

const MAX_TITLE_LENGTH = 40;
const MAX_TEXT_LENGTH = 200;

/**
 * Gemini の出力から候補を作る。決まり（docs/spec.md のデータ-2・データ-4）に合わないところは直すか捨てる:
 *
 * - 1日目の地域が候補にできる地域でない候補、1日目の地域がほかの候補と重なる候補は捨てる
 * - 2日目以降の地域は、1日目の地域かその近い地域（80km 以内）でなければ候補ごと捨てる
 * - 存在しないスポット・その日の地域にないスポット・候補の中で重なったスポットは取り除く。
 *   その結果スポットが2件未満の日ができたら、候補ごと捨てる。5件目以降は切る
 * - 日数が日程より少なければ捨てる。多ければ切る
 * - 必ず入れるスポット（#32）が、どの日の経路にも入っていない候補は捨てる（サーバーで足すと、Gemini の組んだ順や所要時間が崩れるため）
 * - 地域が選ばれているのに、その地域の候補がなければ、全部を捨てる（1件目は必ず選んだ地域にするため）。
 *   ただし必ず入れるスポットが選んだ地域では入れられないとき（近い地域のスポットで日帰り）は、捨てずに近い地域の候補を返す
 *
 * 所要時間・経路外のスポット・「近くの地域」は、Gemini ではなくここで決める
 */
export function toPlanCandidates(
  plan: AiPlan,
  areas: readonly PlannableArea[],
  request: PlanConditions,
  { areaIdByKey, spotIdByKey }: Pick<PlanPrompt, "areaIdByKey" | "spotIdByKey">,
): PlanCandidate[] {
  const { selected, bases, included } = getPlanScope(areas, request);
  const baseIds = new Set(bases.map((area) => area.id));
  const areaById = new Map(areas.map((area) => [area.id, area]));
  const findArea = (key: string) => {
    const id = areaIdByKey.get(key);
    return id === undefined ? undefined : areaById.get(id);
  };
  const dayCount = DAY_COUNTS[request.duration];

  const candidates: PlanCandidate[] = [];
  for (const ai of plan.candidates) {
    if (ai.days.length < dayCount) continue;
    const base = findArea(ai.days[0].areaId);
    if (!base || !baseIds.has(base.id)) continue;
    if (candidates.some((c) => c.id === base.id)) continue;

    const allowed = new Set([
      base.id,
      ...findNearbyAreas(base, areas).map((area) => area.id),
    ]);
    const used = new Set<string>();
    const days: PlanDay[] = [];
    for (const [i, aiDay] of ai.days.slice(0, dayCount).entries()) {
      const area = findArea(aiDay.areaId);
      if (!area || !allowed.has(area.id)) break;

      const route: Spot[] = [];
      for (const key of aiDay.spotIds) {
        const spotId = spotIdByKey.get(key);
        const spot = area.spots.find((s) => s.id === spotId);
        if (!spot || used.has(spot.id)) continue;
        used.add(spot.id);
        route.push(spot);
        if (route.length >= MAX_DAY_SPOTS) break;
      }
      if (route.length < MIN_DAY_SPOTS) break;

      days.push({
        day: i + 1,
        areaId: area.id,
        areaName: area.name,
        route,
        durationMinutes: calcDayMinutes(route, request.transport),
      });
    }
    if (days.length < dayCount) continue;
    if (included && !used.has(included.spot.id)) continue;

    const dayAreaIds = new Set(days.map((d) => d.areaId));
    candidates.push({
      id: base.id,
      areaName: base.name,
      title:
        clip(ai.title, MAX_TITLE_LENGTH) ||
        `${base.name}をめぐる${DURATION_LABELS[request.duration]}プラン`,
      summary: clip(ai.summary, MAX_TEXT_LENGTH) || (base.catchphrase ?? ""),
      reason:
        clip(ai.reason, MAX_TEXT_LENGTH) ||
        "旅の条件に合うスポットを選びました。",
      duration: request.duration,
      days,
      otherSpots: areas
        .filter((area) => dayAreaIds.has(area.id))
        .flatMap((area) => area.spots.filter((s) => !used.has(s.id))),
      nearby: selected !== undefined && base.id !== selected.id,
    });
  }

  if (selected && (!included || baseIds.has(selected.id))) {
    const first = candidates.find((c) => c.id === selected.id);
    if (!first) return [];
    return [first, ...candidates.filter((c) => c !== first)].slice(
      0,
      MAX_CANDIDATES,
    );
  }
  return candidates.slice(0, MAX_CANDIDATES);
}

/** プロンプトの記号を括弧ごと書いたもの（「松本市（A5）」の「（A5）」）。括弧のない「A5」は普通の言葉とぶつかるので消さない */
const PROMPT_KEY_IN_TEXT = /\s*[（(][AS]\d+[）)]/g;

/** プロンプトの記号を消し、前後の空白を取り、長すぎれば切る */
function clip(text: string, max: number): string {
  const trimmed = text.replace(PROMPT_KEY_IN_TEXT, "").trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}
