import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { hashClient } from "@/lib/community/client-hash";
import {
  checkPlanRateLimit,
  PLAN_RATE_LIMIT,
  RATE_LIMIT_TIMEOUT_MS,
} from "./rate-limit";

const SALT = "test-salt";

/** check_rate_limit() の結果を返す、Supabase のクライアントのダミー */
function supabaseReturning(result: {
  data: boolean | null;
  error: { code: string; message: string } | null;
}) {
  const abortSignal = vi.fn(async () => result);
  const rpc = vi.fn<(name: string, args: { p_key: string }) => unknown>(() => ({
    abortSignal,
  }));
  return { rpc, abortSignal, client: { rpc } as never };
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

describe("checkPlanRateLimit", () => {
  test("送信元の IP のハッシュで回数を数え、上限を超えていなければ allowed", async () => {
    const { rpc, client } = supabaseReturning(ok);

    expect(await checkPlanRateLimit(planRequest(), client)).toBe("allowed");
    expect(rpc).toHaveBeenCalledExactlyOnceWith("check_rate_limit", {
      p_key: `plan:${hashClient("203.0.113.7", SALT)}`,
      p_window_seconds: PLAN_RATE_LIMIT.windowSeconds,
      p_max: PLAN_RATE_LIMIT.max,
    });
  });

  test("DB を待つ上限を付ける（応答しないときに止まり続けない）", async () => {
    const { abortSignal, client } = supabaseReturning(ok);
    const timeout = vi.spyOn(AbortSignal, "timeout");

    await checkPlanRateLimit(planRequest(), client);

    expect(timeout).toHaveBeenCalledWith(RATE_LIMIT_TIMEOUT_MS);
    expect(abortSignal).toHaveBeenCalledWith(timeout.mock.results[0].value);
  });

  test("上限を超えたら limited", async () => {
    expect(
      await checkPlanRateLimit(planRequest(), supabaseReturning(denied).client),
    ).toBe("limited");
  });

  test("回数を数えられない（DB のエラー）なら unavailable", async () => {
    const { client } = supabaseReturning({
      data: null,
      error: { code: "PGRST000", message: "connection refused" },
    });

    expect(await checkPlanRateLimit(planRequest(), client)).toBe("unavailable");
  });

  test("本番で RATE_LIMIT_SALT がなければ、DB を呼ばずに unavailable", async () => {
    vi.stubEnv("RATE_LIMIT_SALT", "");
    vi.stubEnv("NODE_ENV", "production");
    const { rpc, client } = supabaseReturning(ok);

    expect(await checkPlanRateLimit(planRequest(), client)).toBe("unavailable");
    expect(rpc).not.toHaveBeenCalled();
  });

  test("送信元が違えば、別のキーで数える", async () => {
    const a = supabaseReturning(ok);
    const b = supabaseReturning(ok);

    await checkPlanRateLimit(planRequest("203.0.113.7"), a.client);
    await checkPlanRateLimit(planRequest("198.51.100.2"), b.client);

    expect(a.rpc.mock.calls[0][1].p_key).not.toBe(b.rpc.mock.calls[0][1].p_key);
  });
});
