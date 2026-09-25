import { getAreasWithSpots } from "@/lib/data/areas";
import { toPlanRequest } from "@/lib/planner/conditions";
import { createPlan } from "@/lib/planner/create-plan";
import { MAX_REQUEST_LENGTH, planConditionsSchema } from "@/lib/planner/schema";

/**
 * 関数の最大実行時間（秒）。Gemini は最大45秒待つ（lib/ai/gemini.ts）ので、DB の読み出しを含めても収まる。
 * Vercel Hobby の上限は300秒
 */
export const maxDuration = 60;

// 旅プランの候補を返す API。Gemini で作り、作れなければデモモードで返す（#18・#19）
export async function POST(request: Request) {
  // TODO(#25): レート制限はここ（入力を読む前）に差し込む

  const text = await request.text();
  if (text.length > MAX_REQUEST_LENGTH) {
    return Response.json({ error: "request_too_large" }, { status: 413 });
  }
  const parsed = planConditionsSchema.safeParse(parseJson(text));
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const areas = await getAreasWithSpots();
  return Response.json(
    await createPlan(areas, toPlanRequest(parsed.data, areas)),
  );
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
