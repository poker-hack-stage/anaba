import { afterEach, describe, expect, test, vi } from "vitest";

import { getClientIp, getRateLimitSalt, hashClient } from "./client-hash";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getClientIp", () => {
  test("x-forwarded-for の先頭を使う", () => {
    expect(
      getClientIp(
        new Headers({ "x-forwarded-for": " 203.0.113.5 , 10.0.0.1" }),
      ),
    ).toBe("203.0.113.5");
  });

  test("x-forwarded-for がなければ x-real-ip、どちらもなければ unknown", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "198.51.100.7" }))).toBe(
      "198.51.100.7",
    );
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});

describe("hashClient", () => {
  test("16進小文字64文字（check_rate_limit() が受け付ける形）で、IP を含まない", () => {
    const hash = hashClient("203.0.113.5", "salt");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("203");
  });

  test("同じ IP と salt なら同じ値、salt が違えば別の値", () => {
    expect(hashClient("203.0.113.5", "salt")).toBe(
      hashClient("203.0.113.5", "salt"),
    );
    expect(hashClient("203.0.113.5", "salt")).not.toBe(
      hashClient("203.0.113.5", "other"),
    );
    expect(hashClient("203.0.113.5", "salt")).not.toBe(
      hashClient("203.0.113.6", "salt"),
    );
  });
});

describe("getRateLimitSalt", () => {
  test("RATE_LIMIT_SALT があればその値", () => {
    vi.stubEnv("RATE_LIMIT_SALT", " secret ");
    expect(getRateLimitSalt()).toBe("secret");
  });

  test("未設定なら、本番では null（受け付けを止める）", () => {
    vi.stubEnv("RATE_LIMIT_SALT", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(getRateLimitSalt()).toBeNull();
  });

  test("未設定なら、開発では固定の値を使う", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("RATE_LIMIT_SALT", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(getRateLimitSalt()).toEqual(expect.any(String));
  });
});
