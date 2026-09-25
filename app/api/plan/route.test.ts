import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createCommunitySupabaseMock } from "@/test/mocks/supabase-community";

const supabase = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => supabase.current,
}));

// DB も Gemini も呼ばない
const { createPlan } = vi.hoisted(() => ({
  createPlan: vi.fn(async () => ({ candidates: [], mode: "demo" })),
}));
vi.mock("@/lib/planner/create-plan", () => ({ createPlan }));
vi.mock("@/lib/data/areas", () => ({ getAreasWithSpots: async () => [] }));

const { POST } = await import("./route");

const valid = {
  areaId: null,
  duration: "day",
  interests: [],
  companion: "ひとり",
  transport: "車",
};

let mock: ReturnType<typeof createCommunitySupabaseMock>;

beforeEach(() => {
  mock = createCommunitySupabaseMock();
  supabase.current = mock.client;
  vi.stubEnv("RATE_LIMIT_SALT", "test-salt");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  createPlan.mockClear();
});

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/plan", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.7",
      },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/plan", () => {
  test("上限以内なら、Gemini を使ってよいとして候補を作る", async () => {
    const res = await post(valid);

    expect(res.status).toBe(200);
    expect(mock.rpc).toHaveBeenCalledWith(
      "check_rate_limit",
      expect.objectContaining({ p_key: expect.stringMatching(/^plan:/) }),
    );
    expect(createPlan).toHaveBeenCalledWith([], valid, { useAi: true });
  });

  test("上限を超えたら、本文を読まずに 429 と Retry-After を返す", async () => {
    mock.state.rateLimitAllowed = false;

    const res = await post(valid);

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "rate_limited" });
    const retryAfter = Number(res.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(10 * 60);
    expect(createPlan).not.toHaveBeenCalled();
  });

  test("形の崩れた依頼でも、上限を超えていれば 429（入力を読む前に数える）", async () => {
    mock.state.rateLimitAllowed = false;

    expect((await post({ note: "?" })).status).toBe(429);
  });

  test("回数を数えられない（DB のエラー）なら、Gemini を使わずに候補を作る", async () => {
    mock.state.rateLimitError = { code: "PGRST000", message: "down" };

    const res = await post(valid);

    expect(res.status).toBe(200);
    expect(createPlan).toHaveBeenCalledWith([], valid, { useAi: false });
  });
});
