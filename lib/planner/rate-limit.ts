import "server-only";
import {
  getClientIp,
  getRateLimitSalt,
  hashClient,
} from "@/lib/community/client-hash";
import type { createClient } from "@/lib/supabase/server";

// /api/plan で Gemini を呼ぶ回数の、送信元（IP）ごとの制限（#25）。上限を超えたら Gemini を呼ばず、デモモードで返す。
// 回数は DB の check_rate_limit()（#51、キーの種類は plan）で数える。Vercel の関数は複数のインスタンスで動くので、
// メモリの中では数えられない。
// 全員の合計の上限は持たない。無料枠（1分15回・1日500回）を超えると Gemini が 429 を返し、
// それでもデモモードに切り替わる（lib/ai/gemini.ts の rate_limited）ので、ここでは1つの送信元が押し続けるのを抑えるだけにする

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * 同じ送信元（IP）から Gemini を使える回数。発表の会場（20人前後）が同じ Wi-Fi（同じ IP）で試しても
 * 足りるよう、多めにしている。1つの IP だけで1日の無料枠を1時間ほどで使い切れる緩さだが、
 * 使い切られてもお金はかからず、その日の残りがデモモードになるだけなので、会場で使えることを優先した
 */
export const PLAN_RATE_LIMIT = { windowSeconds: 10 * 60, max: 100 } as const;

/**
 * この依頼で Gemini を呼んでよいか。
 * DB に接続できない・本番で RATE_LIMIT_SALT がないときは、呼ばない（無料枠を守る側に倒す）
 */
export async function allowGeminiForPlan(
  request: Request,
  supabase: SupabaseClient,
): Promise<boolean> {
  const salt = getRateLimitSalt();
  if (salt === null) {
    console.error(
      "[plan] RATE_LIMIT_SALT が未設定なので、Gemini を使わずデモモードで返します",
    );
    return false;
  }

  const clientHash = hashClient(getClientIp(request.headers), salt);
  const { data: allowed, error } = await supabase.rpc("check_rate_limit", {
    p_key: `plan:${clientHash}`,
    p_window_seconds: PLAN_RATE_LIMIT.windowSeconds,
    p_max: PLAN_RATE_LIMIT.max,
  });
  if (error) {
    console.error("[plan] レート制限を数えられませんでした", {
      code: error.code,
      message: error.message,
    });
    return false;
  }
  if (!allowed) {
    console.warn("[plan] レート制限にかかったので、デモモードで返します");
    return false;
  }
  return true;
}
