import type { Spot } from "@/lib/data/spots";
import { DAY_COUNTS } from "./duration";
import type { PlannableArea } from "./generate";
import { findNearbyAreas } from "./nearby";
import type { PlanConditions } from "./types";

// 「このスポットを経路に加えて作り直す」（#32）で、必ず経路に入れるスポットの扱い

/** 必ず経路に入れるスポットと、その地域 */
export type IncludedSpot = { spot: Spot; area: PlannableArea };

/**
 * 条件の includeSpotId から、スポットとその地域を引く。
 * 指定がなければ null、指定があっても見つからなければ undefined（どの候補にも入れられないので、候補は0件になる）
 */
export function findIncludedSpot(
  areas: readonly PlannableArea[],
  request: PlanConditions,
): IncludedSpot | null | undefined {
  if (request.includeSpotId === undefined) return null;
  for (const area of areas) {
    const spot = area.spots.find((s) => s.id === request.includeSpotId);
    if (spot) return { spot, area };
  }
  return undefined;
}

/**
 * base を1日目にした候補の経路に、スポットを入れられるか。
 * 1日目は base、2日目以降は base かその近い地域（80km 以内）しか使えないので（docs/spec.md のデータ-2・データ-4）、
 * スポットの地域が base か、複数日で base の近い地域のときだけ入れられる
 */
export function canInclude(
  base: PlannableArea,
  included: IncludedSpot,
  areas: readonly PlannableArea[],
  request: PlanConditions,
): boolean {
  if (base.id === included.area.id) return true;
  return (
    DAY_COUNTS[request.duration] > 1 &&
    findNearbyAreas(base, areas).some((area) => area.id === included.area.id)
  );
}
