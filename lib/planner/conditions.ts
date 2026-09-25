import type { Area } from "@/lib/data/areas";
import { DURATION_LABELS } from "./duration";
import type { PlanConditions, PlanDuration, PlanRequest } from "./types";

/**
 * 画面のフォームから届いた条件（地域名・日程の文言）を、候補を作るときの形（地域の id・日程のコード）に変える。
 * 知らない地域名は「おまかせ」、知らない日程は日帰りとして扱う。
 * TODO(#17): フォームが areaId・PlanDuration で送るようになったら、この変換はなくす
 */
export function toPlanRequest(
  conditions: PlanConditions,
  areas: readonly Pick<Area, "id" | "name">[],
): PlanRequest {
  const duration =
    (Object.keys(DURATION_LABELS) as PlanDuration[]).find(
      (key) => DURATION_LABELS[key] === conditions.duration,
    ) ?? "day";
  return {
    areaId: areas.find((area) => area.name === conditions.area)?.id ?? null,
    duration,
    interests: conditions.interests,
    companion: conditions.companion,
    transport: conditions.transport,
  };
}
