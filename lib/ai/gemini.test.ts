// @vitest-environment node
// サーバーで動くモジュールなので、ブラウザを真似た jsdom ではなく node で動かす

import {
  ApiError,
  BlockedReason,
  FinishReason,
  type GenerateContentResponse,
} from "@google/genai";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  callGemini,
  DEFAULT_GEMINI_MODEL,
  GEMINI_TIMEOUT_MS,
  getGeminiModel,
} from "./gemini";

const { generateContent, constructed } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  constructed: [] as unknown[],
}));

// 実際には API を呼ばない。ApiError や FinishReason などは本物を使う
vi.mock("@google/genai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@google/genai")>();
  class MockGoogleGenAI {
    models = { generateContent };
    constructor(options: unknown) {
      constructed.push(options);
    }
  }
  return { ...actual, GoogleGenAI: MockGoogleGenAI };
});

const params = { contents: "こんにちは" };

function fakeResponse(
  overrides: Partial<GenerateContentResponse> = {},
): GenerateContentResponse {
  return {
    candidates: [
      {
        content: { role: "model", parts: [{ text: "こんにちは" }] },
        finishReason: FinishReason.STOP,
      },
    ],
    modelVersion: DEFAULT_GEMINI_MODEL,
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
    ...overrides,
  } as GenerateContentResponse;
}

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("GEMINI_MODEL", "");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  generateContent.mockReset();
  constructed.length = 0;
});

describe("getGeminiModel", () => {
  test("GEMINI_MODEL が未指定なら既定のモデルを使う", () => {
    expect(getGeminiModel()).toBe("gemini-3.5-flash-lite");
  });

  test("GEMINI_MODEL を指定すればそのモデルを使う", () => {
    vi.stubEnv("GEMINI_MODEL", "gemini-3.8-flash");
    expect(getGeminiModel()).toBe("gemini-3.8-flash");
  });

  test("空白だけなら未指定として扱う", () => {
    vi.stubEnv("GEMINI_MODEL", "  ");
    expect(getGeminiModel()).toBe(DEFAULT_GEMINI_MODEL);
  });
});

describe("callGemini", () => {
  test("環境変数のモデルで呼び、応答を返す", async () => {
    vi.stubEnv("GEMINI_MODEL", "gemini-3.8-flash");
    const response = fakeResponse();
    generateContent.mockResolvedValue(response);

    const result = await callGemini(params);

    expect(result).toEqual({
      ok: true,
      model: "gemini-3.8-flash",
      response,
    });
    expect(generateContent).toHaveBeenCalledWith({
      ...params,
      model: "gemini-3.8-flash",
    });
  });

  test("呼び出し側の設定で、タイムアウト・再試行・中断を変えられない", async () => {
    generateContent.mockResolvedValue(fakeResponse());

    await callGemini({
      ...params,
      config: {
        systemInstruction: "指示",
        // 型では禁止しているが、実行時に紛れ込んでも取り除く
        ...({
          httpOptions: { timeout: 600_000, retryOptions: { attempts: 5 } },
          abortSignal: new AbortController().signal,
        } as object),
      },
    });

    expect(generateContent).toHaveBeenCalledWith({
      ...params,
      model: DEFAULT_GEMINI_MODEL,
      config: {
        systemInstruction: "指示",
        httpOptions: undefined,
        abortSignal: undefined,
      },
    });
  });

  test("API キーとタイムアウトを渡し、再試行の設定は渡さない", async () => {
    generateContent.mockResolvedValue(fakeResponse());

    await callGemini(params);

    expect(constructed).toEqual([
      { apiKey: "test-key", httpOptions: { timeout: GEMINI_TIMEOUT_MS } },
    ]);
  });

  test("API キーがなければ呼ばずに missing_api_key を返す", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const result = await callGemini(params);

    expect(result).toEqual({
      ok: false,
      model: DEFAULT_GEMINI_MODEL,
      reason: "missing_api_key",
    });
    expect(generateContent).not.toHaveBeenCalled();
  });

  test("時間切れなら timeout を返す", async () => {
    generateContent.mockRejectedValue(
      new DOMException("This operation was aborted", "AbortError"),
    );

    const result = await callGemini(params);

    expect(result).toMatchObject({ ok: false, reason: "timeout" });
  });

  test("無料枠の上限（429）なら rate_limited を返す", async () => {
    generateContent.mockRejectedValue(
      new ApiError({ message: "quota exceeded", status: 429 }),
    );

    const result = await callGemini(params);

    expect(result).toMatchObject({ ok: false, reason: "rate_limited" });
  });

  test("そのほかの API のエラーなら例外を投げずに api_error を返す", async () => {
    generateContent.mockRejectedValue(
      new ApiError({ message: "internal", status: 500 }),
    );

    const result = await callGemini(params);

    expect(result).toMatchObject({ ok: false, reason: "api_error" });
  });

  test("入力が止められたら blocked を返す", async () => {
    generateContent.mockResolvedValue(
      fakeResponse({
        candidates: [],
        promptFeedback: { blockReason: BlockedReason.SAFETY },
      }),
    );

    const result = await callGemini(params);

    expect(result).toMatchObject({ ok: false, reason: "blocked" });
  });

  test("出力が止められたら blocked を返す", async () => {
    generateContent.mockResolvedValue(
      fakeResponse({
        candidates: [{ finishReason: FinishReason.SAFETY }],
      }),
    );

    const result = await callGemini(params);

    expect(result).toMatchObject({ ok: false, reason: "blocked" });
  });
});
