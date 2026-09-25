import "server-only";
import { z } from "zod";
import { readLimitedText } from "@/lib/http/read-limited-text";
import type { createClient } from "@/lib/supabase/server";
import { getClientIp, getRateLimitSalt, hashClient } from "./client-hash";
import {
  CLOSED,
  INVALID_REQUEST,
  RATE_LIMITED,
  REQUEST_TOO_LARGE,
  errorResponse,
  isUnexpected,
  toRateLimitApiError,
  type ApiError,
  type DbError,
  type WriteKind,
} from "./errors";
import { MAX_REQUEST_BYTES } from "./schema";

// 口コミ・スポットの投稿の API（#52）で共通の、書き込む前の手順（本文の読み取りと検証・レート制限）

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type Result<T> = { ok: true; value: T } | { ok: false; response: Response };

/** 同じ送信元（IP）から受け付ける回数（docs/spec.md 画面-4） */
export const RATE_LIMITS = {
  review: { windowSeconds: 10 * 60, max: 3 },
  submission: { windowSeconds: 60 * 60, max: 2 },
} as const satisfies Record<WriteKind, unknown>;

/** 本文を上限まで読み、JSON にしてスキーマで確かめる。だめなら 413・400 の応答を返す */
export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<Result<z.output<S>>> {
  const text = await readLimitedText(request, MAX_REQUEST_BYTES);
  if (text === null) {
    return { ok: false, response: errorResponse(REQUEST_TOO_LARGE) };
  }
  const parsed = schema.safeParse(parseJson(text));
  if (!parsed.success) {
    return { ok: false, response: errorResponse(invalid(parsed.error)) };
  }
  return { ok: true, value: parsed.data };
}

/**
 * 送信元のハッシュを作り、レート制限を数える。上限を超えたら 429 の応答を返す。
 * 成功したら、DB の client_hash に入れるハッシュを返す（生の IP はここから外に出さない）
 */
export async function checkClientRateLimit(
  request: Request,
  supabase: SupabaseClient,
  kind: WriteKind,
): Promise<Result<string>> {
  const salt = getRateLimitSalt();
  if (salt === null) {
    console.error(
      "RATE_LIMIT_SALT が未設定なので、口コミ・スポットの投稿を受け付けません",
    );
    return { ok: false, response: errorResponse(CLOSED) };
  }
  const clientHash = hashClient(getClientIp(request.headers), salt);

  const { windowSeconds, max } = RATE_LIMITS[kind];
  const { data: allowed, error } = await supabase.rpc("check_rate_limit", {
    p_key: `${kind}:${clientHash}`,
    p_window_seconds: windowSeconds,
    p_max: max,
  });
  if (error) {
    return {
      ok: false,
      response: dbErrorResponse(toRateLimitApiError(error), error, kind),
    };
  }
  if (!allowed) {
    return {
      ok: false,
      response: errorResponse(RATE_LIMITED, {
        "Retry-After": String(secondsUntilWindowEnd(windowSeconds, Date.now())),
      }),
    };
  }
  return { ok: true, value: clientHash };
}

/**
 * DB のエラーの応答。想定していないエラーだけログに残す。
 * details・hint は書かない（check 制約の違反では、client_hash を含む行の中身が入るため）
 */
export function dbErrorResponse(
  apiError: ApiError,
  error: DbError & { message?: string },
  kind: WriteKind | "read",
): Response {
  if (isUnexpected(apiError)) {
    console.error(`口コミ・投稿の API（${kind}）で DB がエラーを返しました`, {
      code: error.code,
      message: error.message,
    });
  }
  return errorResponse(apiError);
}

/** 固定の時間枠（DB の check_rate_limit() と同じ区切り）が終わるまでの秒数 */
export function secondsUntilWindowEnd(
  windowSeconds: number,
  nowMs: number,
): number {
  return windowSeconds - (Math.floor(nowMs / 1000) % windowSeconds);
}

function invalid(error: z.ZodError): ApiError {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".");
    // 余計な項目（strictObject）は欄に結び付かないので、全体のエラーにだけする
    if (key && !(key in fields)) fields[key] = issue.message;
  }
  return {
    status: INVALID_REQUEST.status,
    body: { ...INVALID_REQUEST.body, fields },
  };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
