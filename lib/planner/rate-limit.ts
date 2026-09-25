import "server-only";
import {
  getClientIp,
  getRateLimitSalt,
  hashClient,
} from "@/lib/community/client-hash";
import type { createClient } from "@/lib/supabase/server";

// /api/plan で Gemini を呼ぶ回数の制限（#25）。上限を超えたら Gemini を呼ばず、デモモードで返す。
// 回数は DB の check_rate_limit()（#51、キーの種類は plan）で数える。Vercel の関数は複数のインスタンスで動くので、
// メモリの中では数えられない

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Gemini の無料枠（1分15回・1日500回、プロジェクトごと）を使い切らないための上限。
 * client は同じ送信元（IP）から、minute・day は全員の合計
 */
export const PLAN_RATE_LIMITS = {
  client: { windowSeconds: 10 * 60, max: 10 },
  minute: { windowSeconds: 60, max: 12 },
  day: { windowSeconds: 24 * 60 * 60, max: 400 },
} as const;

type Limit = keyof typeof PLAN_RATE_LIMITS;

/**
 * この依頼で Gemini を呼んでよいか。送信元の上限から数え、超えていたらそこで止める
 * （送信元の上限で止めた依頼は、全員の合計に数えない）。
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

  const keys: Record<Limit, string> = {
    client: hashClient(getClientIp(request.headers), salt),
    // 全員の合計のキー。IP のハッシュと同じ形（16進64文字）にする
    minute: hashClient("plan:all:minute", salt),
    day: hashClient("plan:all:day", salt),
  };

  for (const limit of ["client", "minute", "day"] as const) {
    const { windowSeconds, max } = PLAN_RATE_LIMITS[limit];
    const { data: allowed, error } = await supabase.rpc("check_rate_limit", {
      p_key: `plan:${keys[limit]}`,
      p_window_seconds: windowSeconds,
      p_max: max,
    });
    if (error) {
      console.error("[plan] レート制限を数えられませんでした", {
        code: error.code,
        message: error.message,
      });
      return false;
    }
    if (!allowed) {
      console.warn("[plan] レート制限にかかったので、デモモードで返します", {
        limit,
      });
      return false;
    }
  }
  return true;
}
