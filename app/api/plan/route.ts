import { getAreasWithSpots } from "@/lib/data/areas";
import { generateCandidates } from "@/lib/planner/generate";
import type { PlanConditions, PlanResponse } from "@/lib/planner/types";

// 旅プランの候補を返す API
// TODO(#27): 悪用・料金対策（レート制限など）
export async function POST(request: Request) {
  const conditions = (await request.json()) as PlanConditions;

  const areas = await getAreasWithSpots();
  const body: PlanResponse = {
    candidates: generateCandidates(areas, conditions),
  };

  return Response.json(body);
}
