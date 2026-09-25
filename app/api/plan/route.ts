import { getAreasWithSpots } from "@/lib/data/areas";
import { toPlanRequest } from "@/lib/planner/conditions";
import { generateCandidates } from "@/lib/planner/generate";
import type { PlanConditions, PlanResponse } from "@/lib/planner/types";

// 旅プランの候補を返す API
// TODO(#18): 入力を検証し、Gemini（lib/ai/gemini.ts）で候補を作る。Gemini を呼べないときは今のデモモードで返す
// TODO(#25): 悪用対策（レート制限など）
export async function POST(request: Request) {
  const conditions = (await request.json()) as PlanConditions;

  const areas = await getAreasWithSpots();
  const body: PlanResponse = {
    candidates: generateCandidates(areas, toPlanRequest(conditions, areas)),
    mode: "demo",
  };

  return Response.json(body);
}
