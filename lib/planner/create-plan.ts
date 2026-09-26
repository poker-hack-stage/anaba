import "server-only";

import { callGemini } from "@/lib/ai/gemini";
import { toPlanCandidates } from "./ai-candidates";
import { buildPlanPrompt } from "./ai-prompt";
import { generateCandidates, type PlannableArea } from "./generate";
import { AI_PLAN_JSON_SCHEMA, aiPlanSchema } from "./schema";
import type { PlanCandidate, PlanConditions, PlanResponse } from "./types";

/**
 * Gemini の出力のばらつき（#113）。記号・件数の決まりを守らせたいので低めにし、
 * 同じ条件で「絞る」を押し直したときに少し違う候補が出る程度は残す
 */
const PLAN_TEMPERATURE = 0.4;

/**
 * 旅プランの候補を作る。Gemini で作れなければ（キーなし・時間切れ・無料枠の上限・形の崩れ・使える候補が0件）、
 * デモモード（generateCandidates()、#19）で作る。無料枠の回数を使わないよう、Gemini はやり直さない。
 * useAi が false（レート制限の回数を数えられなかった、#25）なら、Gemini を呼ばずにデモモードで作る
 */
export async function createPlan(
  areas: readonly PlannableArea[],
  request: PlanConditions,
  { useAi = true }: { useAi?: boolean } = {},
): Promise<PlanResponse> {
  const candidates = useAi ? await generateAiCandidates(areas, request) : null;
  if (candidates) return { candidates, mode: "ai" };
  return { candidates: generateCandidates(areas, request), mode: "demo" };
}

async function generateAiCandidates(
  areas: readonly PlannableArea[],
  request: PlanConditions,
): Promise<PlanCandidate[] | null> {
  const prompt = buildPlanPrompt(areas, request);
  if (prompt.spotIdByKey.size === 0) return null;

  const result = await callGemini({
    contents: prompt.contents,
    config: {
      systemInstruction: prompt.systemInstruction,
      temperature: PLAN_TEMPERATURE,
      responseMimeType: "application/json",
      responseJsonSchema: AI_PLAN_JSON_SCHEMA,
    },
  });
  if (!result.ok) {
    console.warn("[plan] デモモードに切り替え:", result.reason);
    return null;
  }

  const parsed = aiPlanSchema.safeParse(parseJson(result.response.text));
  if (!parsed.success) {
    console.warn("[plan] デモモードに切り替え: Gemini の出力の形が崩れている");
    return null;
  }

  const candidates = toPlanCandidates(parsed.data, areas, request, prompt);
  // プロンプトの調整に使う: Gemini が返した候補のうち、決まりに合ったものの数
  console.info("[plan]", {
    returned: parsed.data.candidates.length,
    valid: candidates.length,
  });
  if (candidates.length === 0) {
    console.warn("[plan] デモモードに切り替え: 決まりに合う候補が0件");
    return null;
  }
  return candidates;
}

function parseJson(text: string | undefined): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
