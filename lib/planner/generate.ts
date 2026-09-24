import type { AreaWithSpots } from "@/lib/data/areas";
import type { SpotCategory } from "@/lib/spots/categories";
import type { PlanCandidate, PlanConditions } from "./types";

const INTEREST_TO_CATEGORY: Record<string, SpotCategory> = {
  食: "gourmet",
  自然: "nature",
  絶景: "view",
  温泉: "onsen",
  体験: "craft",
  歴史: "history",
};

const MAX_CANDIDATES = 3;
const MAX_ROUTE_LENGTH = 4;

/**
 * 条件から旅プランの候補を作る。
 * TODO(#20): Claude API で候補・経路・説明文を作るように差し替える。
 *            今は「興味に合うスポットを評価順に並べるだけ」の仮実装（#21 のデモモードの土台にもなる）
 */
export function generateCandidates(
  areas: AreaWithSpots[],
  conditions: PlanConditions,
): PlanCandidate[] {
  const wanted = new Set(
    conditions.interests.map((i) => INTEREST_TO_CATEGORY[i]).filter(Boolean),
  );

  return areas
    .filter(
      (area) => conditions.area === "おまかせ" || area.name === conditions.area,
    )
    .filter((area) => area.spots.length > 0)
    .slice(0, MAX_CANDIDATES)
    .map((area) => {
      const sorted = [...area.spots].sort(
        (a, b) =>
          Number(wanted.has(b.category as SpotCategory)) -
            Number(wanted.has(a.category as SpotCategory)) ||
          (b.rating ?? 0) - (a.rating ?? 0),
      );
      const route = sorted.slice(0, MAX_ROUTE_LENGTH);
      const routeIds = new Set(route.map((s) => s.id));

      return {
        id: area.id,
        areaName: area.name,
        title: `${area.name}をめぐる${conditions.duration}プラン`,
        summary: area.catchphrase ?? "",
        route,
        otherSpots: area.spots.filter((s) => !routeIds.has(s.id)),
      };
    });
}
