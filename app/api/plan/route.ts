import { getAreasWithSpots } from "@/lib/data/areas";
import { readLimitedText } from "@/lib/http/read-limited-text";
import { createPlan } from "@/lib/planner/create-plan";
import { secondsUntilWindowEnd } from "@/lib/community/write";
import { checkPlanRateLimit, PLAN_RATE_LIMIT } from "@/lib/planner/rate-limit";
import { MAX_REQUEST_BYTES, planConditionsSchema } from "@/lib/planner/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * 関数の最大実行時間（秒）。Gemini は最大45秒待つ（lib/ai/gemini.ts）ので、DB の読み出しを含めても収まる。
 * Vercel Hobby の上限は300秒
 */
export const maxDuration = 60;

// 旅プランの候補を返す API。Gemini で作り、作れなければデモモードで返す（#18・#19）
export async function POST(request: Request) {
  // 入力を読む前に数える（#25）。上限を超えたら 429。数えられないときは Gemini を使わない
  // （デモモードで返す。DB がまるごと止まっていれば、次の地域の読み出しで 500 になり、ブラウザがデモモードの候補を作る）
  const rateLimit = await checkPlanRateLimit(request, await createClient());
  if (rateLimit === "limited") {
    return Response.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            secondsUntilWindowEnd(PLAN_RATE_LIMIT.windowSeconds, Date.now()),
          ),
        },
      },
    );
  }

  // 大きな本文を全部メモリに読まないよう、上限を超えた時点で読むのをやめる
  const text = await readLimitedText(request, MAX_REQUEST_BYTES);
  if (text === null) {
    return Response.json({ error: "request_too_large" }, { status: 413 });
  }
  const parsed = planConditionsSchema.safeParse(parseJson(text));
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const areas = await getAreasWithSpots();
  return Response.json(
    await createPlan(areas, parsed.data, { useAi: rateLimit === "allowed" }),
  );
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
