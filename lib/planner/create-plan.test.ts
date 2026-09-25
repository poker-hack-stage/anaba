import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { GeminiResult } from "@/lib/ai/gemini";
import { areas, matsumoto, request } from "@/test/fixtures/planner";
import { buildPlanPrompt } from "./ai-prompt";
import { createPlan } from "./create-plan";
import { AI_PLAN_JSON_SCHEMA } from "./schema";

const { callGemini } = vi.hoisted(() => ({ callGemini: vi.fn() }));

// 実際には Gemini を呼ばない
vi.mock("@/lib/ai/gemini", () => ({ callGemini }));

function geminiText(text: string): GeminiResult {
  return {
    ok: true,
    model: "gemini-test",
    response: { text } as never,
  };
}

/** 松本市の最初の2件で日帰りの候補を1件返す、Gemini の出力 */
function validOutput() {
  const prompt = buildPlanPrompt(areas, request({ areaId: "松本市" }));
  const keyOf = (map: Map<string, string>, id: string) =>
    [...map].find(([, value]) => value === id)?.[0];
  return JSON.stringify({
    candidates: [
      {
        title: "松本の旅",
        summary: "説明",
        reason: "理由",
        days: [
          {
            areaId: keyOf(prompt.areaIdByKey, matsumoto.id),
            spotIds: matsumoto.spots
              .slice(0, 2)
              .map((s) => keyOf(prompt.spotIdByKey, s.id)),
          },
        ],
      },
    ],
  });
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  callGemini.mockReset();
});

describe("createPlan", () => {
  test("Gemini の候補が決まりに合えば、mode: ai で返す", async () => {
    callGemini.mockResolvedValue(geminiText(validOutput()));

    const plan = await createPlan(areas, request({ areaId: "松本市" }));

    expect(plan.mode).toBe("ai");
    expect(plan.candidates.map((c) => c.title)).toEqual(["松本の旅"]);
  });

  test("構造化出力（JSON Schema）とシステムの指示を渡す", async () => {
    callGemini.mockResolvedValue(geminiText(validOutput()));

    await createPlan(areas, request({ areaId: "松本市" }));

    expect(callGemini).toHaveBeenCalledWith({
      contents: expect.stringContaining("# 旅の条件"),
      config: {
        systemInstruction: expect.stringContaining("旅のプランナー"),
        responseMimeType: "application/json",
        responseJsonSchema: AI_PLAN_JSON_SCHEMA,
      },
    });
  });

  test.each([
    ["キーがない", "missing_api_key"],
    ["時間切れ", "timeout"],
    ["無料枠の上限", "rate_limited"],
    ["安全フィルター", "blocked"],
    ["API のエラー", "api_error"],
  ] as const)(
    "Gemini を呼べない（%s）なら、デモモードで返す",
    async (_, reason) => {
      callGemini.mockResolvedValue({ ok: false, model: "gemini-test", reason });

      const plan = await createPlan(areas, request({ areaId: "松本市" }));

      expect(plan.mode).toBe("demo");
      expect(plan.candidates.length).toBeGreaterThan(1);
    },
  );

  test.each([
    ["JSON でない", "候補はこちらです"],
    ["形が違う", JSON.stringify({ plans: [] })],
    ["決まりに合う候補が0件", JSON.stringify({ candidates: [] })],
  ])("Gemini の出力が使えない（%s）なら、デモモードで返す", async (_, text) => {
    callGemini.mockResolvedValue(geminiText(text));

    const plan = await createPlan(areas, request({ areaId: "松本市" }));

    expect(plan.mode).toBe("demo");
    expect(plan.candidates[0].id).toBe("松本市");
  });
});
