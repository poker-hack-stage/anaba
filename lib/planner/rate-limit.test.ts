import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { hashClient } from "@/lib/community/client-hash";
import { allowGeminiForPlan, PLAN_RATE_LIMITS } from "./rate-limit";

const SALT = "test-salt";

/** check_rate_limit() の結果を順に返す、Supabase のクライアントのダミー */
function supabaseReturning(
  ...results: {
    data: boolean | null;
    error: { code: string; message: string } | null;
  }[]
) {
  const rpc = vi.fn();
  for (const result of results) rpc.mockResolvedValueOnce(result);
  return { rpc, client: { rpc } as never };
}

const ok = { data: true, error: null };
const denied = { data: false, error: null };

function planRequest(ip = "203.0.113.7") {
  return new Request("http://localhost/api/plan", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

beforeEach(() => {
  vi.stubEnv("RATE_LIMIT_SALT", SALT);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("allowGeminiForPlan", () => {
  test("送信元・1分・1日の上限をこの順に数え、どれも超えていなければ呼んでよい", async () => {
    const { rpc, client } = supabaseReturning(ok, ok, ok);

    expect(await allowGeminiForPlan(planRequest(), client)).toBe(true);

    expect(rpc.mock.calls.map(([name, args]) => [name, args])).toEqual([
      [
        "check_rate_limit",
        {
          p_key: `plan:${hashClient("203.0.113.7", SALT)}`,
          p_window_seconds: PLAN_RATE_LIMITS.client.windowSeconds,
          p_max: PLAN_RATE_LIMITS.client.max,
        },
      ],
      [
        "check_rate_limit",
        {
          p_key: `plan:${hashClient("plan:all:minute", SALT)}`,
          p_window_seconds: 60,
          p_max: PLAN_RATE_LIMITS.minute.max,
        },
      ],
      [
        "check_rate_limit",
        {
          p_key: `plan:${hashClient("plan:all:day", SALT)}`,
          p_window_seconds: 24 * 60 * 60,
          p_max: PLAN_RATE_LIMITS.day.max,
        },
      ],
    ]);
  });

  test("上限は Gemini の無料枠（1分15回・1日500回）より少ない", () => {
    expect(PLAN_RATE_LIMITS.minute.max).toBeLessThan(15);
    expect(PLAN_RATE_LIMITS.day.max).toBeLessThan(500);
  });

  test("送信元の上限を超えたら呼ばず、全員の合計には数えない", async () => {
    const { rpc, client } = supabaseReturning(denied);

    expect(await allowGeminiForPlan(planRequest(), client)).toBe(false);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  test("全員の合計の上限を超えたら呼ばない", async () => {
    expect(
      await allowGeminiForPlan(
        planRequest(),
        supabaseReturning(ok, denied).client,
      ),
    ).toBe(false);
    expect(
      await allowGeminiForPlan(
        planRequest(),
        supabaseReturning(ok, ok, denied).client,
      ),
    ).toBe(false);
  });

  test("回数を数えられない（DB のエラー）なら呼ばない", async () => {
    const { client } = supabaseReturning({
      data: null,
      error: { code: "PGRST000", message: "connection refused" },
    });

    expect(await allowGeminiForPlan(planRequest(), client)).toBe(false);
  });

  test("本番で RATE_LIMIT_SALT がなければ、DB を呼ばずに呼ばない", async () => {
    vi.stubEnv("RATE_LIMIT_SALT", "");
    vi.stubEnv("NODE_ENV", "production");
    const { rpc, client } = supabaseReturning(ok, ok, ok);

    expect(await allowGeminiForPlan(planRequest(), client)).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  test("送信元が違えば、別のキーで数える", async () => {
    const a = supabaseReturning(ok, ok, ok);
    const b = supabaseReturning(ok, ok, ok);

    await allowGeminiForPlan(planRequest("203.0.113.7"), a.client);
    await allowGeminiForPlan(planRequest("198.51.100.2"), b.client);

    expect(a.rpc.mock.calls[0][1].p_key).not.toBe(b.rpc.mock.calls[0][1].p_key);
    // 全員の合計のキーは同じ
    expect(a.rpc.mock.calls[1][1].p_key).toBe(b.rpc.mock.calls[1][1].p_key);
  });
});
