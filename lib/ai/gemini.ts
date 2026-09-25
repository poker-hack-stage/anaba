import "server-only";

import {
  ApiError,
  FinishReason,
  GoogleGenAI,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from "@google/genai";

// Gemini API を呼ぶのはこのファイルだけにする（無料枠の上限を使い切らないよう、呼び出しをサーバー側の1か所にまとめる）。
// server-only により、クライアントコンポーネントから読み込むとビルドエラーになる

/**
 * GEMINI_MODEL が未指定のときに使うモデル（docs/spec.md の技術-1）。
 * 無料枠で使える安定版の Flash のうち、いちばん新しいもの
 */
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

/**
 * 1回の呼び出しで待つ時間の上限（ミリ秒）。
 * /api/plan の maxDuration（60秒の予定、#18）より短くし、時間切れでもデモモード（#19）に切り替える余裕を残す
 */
export const GEMINI_TIMEOUT_MS = 45_000;

/** 呼べなかった理由。呼び出し側はどれでもデモモード（#19）に切り替える */
export type GeminiFailureReason =
  /** GEMINI_API_KEY が設定されていない */
  | "missing_api_key"
  /** GEMINI_TIMEOUT_MS を過ぎた */
  | "timeout"
  /** 無料枠の上限（1分・1日あたりの回数やトークン数）に当たった（HTTP 429） */
  | "rate_limited"
  /** 安全フィルターなどで、入力か出力が止められた */
  | "blocked"
  /** 認証・サーバーエラー・通信エラーなど */
  | "api_error";

export type GeminiResult =
  | { ok: true; model: string; response: GenerateContentResponse }
  | { ok: false; model: string; reason: GeminiFailureReason; error?: unknown };

/** 出力が止められたときの終了理由 */
const BLOCKED_FINISH_REASONS: ReadonlySet<FinishReason | undefined> = new Set([
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
]);

/** 使うモデル。GEMINI_MODEL で切り替える（例: gemini-3.5-flash-lite） */
export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

/**
 * Gemini にリクエストを送る。失敗しても例外は投げず、理由を `ok: false` で返す。
 * モデルは環境変数で決めるので、params には含めない。
 */
export async function callGemini(
  params: Omit<GenerateContentParameters, "model">,
): Promise<GeminiResult> {
  const model = getGeminiModel();

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, model, reason: "missing_api_key" };
  }

  // retryOptions を渡さないと再試行しない。再試行すると待ち時間が GEMINI_TIMEOUT_MS の数倍に延び、
  // 無料枠の回数も余計に使うため、失敗したらそのままデモモードに回す
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: GEMINI_TIMEOUT_MS },
  });

  const startedAt = Date.now();
  try {
    const response = await ai.models.generateContent({ ...params, model });
    const finishReason = response.candidates?.[0]?.finishReason;
    const blockReason = response.promptFeedback?.blockReason;
    // モデルの切り替えと、応答時間・トークン数（無料枠の上限との比較）を確かめるためのログ
    console.info("[gemini]", {
      model,
      modelVersion: response.modelVersion,
      ms: Date.now() - startedAt,
      finishReason,
      blockReason,
      promptTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
      thoughtsTokens: response.usageMetadata?.thoughtsTokenCount,
    });

    if (blockReason || BLOCKED_FINISH_REASONS.has(finishReason)) {
      return { ok: false, model, reason: "blocked" };
    }
    return { ok: true, model, response };
  } catch (error) {
    const reason = toFailureReason(error);
    console.error("[gemini]", { model, ms: Date.now() - startedAt, reason });
    return { ok: false, model, reason, error };
  }
}

function toFailureReason(error: unknown): GeminiFailureReason {
  if (error instanceof ApiError && error.status === 429) return "rate_limited";
  // httpOptions.timeout を過ぎると、SDK が fetch を中断する
  if (error instanceof Error && error.name === "AbortError") return "timeout";
  return "api_error";
}
