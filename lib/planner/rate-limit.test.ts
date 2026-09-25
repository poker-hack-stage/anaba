import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { hashClient } from "@/lib/community/client-hash";
import { allowGeminiForPlan, PLAN_RATE_LIMIT } from "./rate-limit";

const SALT = "test-salt";

/** check_rate_limit() の結果を返す、Supabase のクライアントのダミー */
function supabaseReturning(result: {
  data: boolean | null;
  error: { code: string; message: string } | null;
}) {
  const rpc = vi.fn().mockResolvedValue(result);
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
  test("送信元の IP のハッシュで回数を数え、上限を超えていなければ呼んでよい", async () => {
    const { rpc, client } = supabaseReturning(ok);

    expect(await allowGeminiForPlan(planRequest(), client)).toBe(true);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("check_rate_limit", {
      p_key: `plan:${hashClient("203.0.113.7", SALT)}`,
      p_window_seconds: PLAN_RATE_LIMIT.windowSeconds,
      p_max: PLAN_RATE_LIMIT.max,
    });
  });

  test("上限を超えたら呼ばない", async () => {
    expect(
      await allowGeminiForPlan(planRequest(), supabaseReturning(denied).client),
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
    const { rpc, client } = supabaseReturning(ok);

    expect(await allowGeminiForPlan(planRequest(), client)).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  test("送信元が違えば、別のキーで数える", async () => {
    const a = supabaseReturning(ok);
    const b = supabaseReturning(ok);

    await allowGeminiForPlan(planRequest("203.0.113.7"), a.client);
    await allowGeminiForPlan(planRequest("198.51.100.2"), b.client);

    expect(a.rpc.mock.calls[0][1].p_key).not.toBe(b.rpc.mock.calls[0][1].p_key);
  });
});
