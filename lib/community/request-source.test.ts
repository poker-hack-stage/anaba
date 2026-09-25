import { describe, expect, test } from "vitest";

import { isJsonContentType, isSameOrigin } from "./request-source";

/** 自サイトの URL とは別のホスト（host ヘッダーを優先することを確かめるため） */
function req(headers: Record<string, string>) {
  return new Request("http://unused.invalid/api/x", { headers });
}

describe("isSameOrigin", () => {
  const host = "anaba.vercel.app";

  test("Origin のホストが host と同じなら自サイト（スキームは見ない）", () => {
    expect(
      isSameOrigin(req({ host, origin: "https://anaba.vercel.app" })),
    ).toBe(true);
    expect(isSameOrigin(req({ host, origin: "http://anaba.vercel.app" }))).toBe(
      true,
    );
  });

  test("x-forwarded-host があればそちらを自サイトのホストにする", () => {
    expect(
      isSameOrigin(
        req({
          host: "internal:3000",
          "x-forwarded-host": "anaba-abc123-team.vercel.app",
          origin: "https://anaba-abc123-team.vercel.app",
        }),
      ),
    ).toBe(true);
  });

  test("Origin がなければ Referer のオリジンで見る", () => {
    expect(
      isSameOrigin(req({ host, referer: "https://anaba.vercel.app/spots/x" })),
    ).toBe(true);
    expect(isSameOrigin(req({ host, referer: "https://evil.example/" }))).toBe(
      false,
    );
  });

  test("別のホスト・サブドメイン・null・読めない値は自サイトでない", () => {
    for (const origin of [
      "https://evil.example",
      "https://x.anaba.vercel.app",
      "https://anaba.vercel.app.evil.example",
      "null",
      "not a url",
    ]) {
      expect(isSameOrigin(req({ host, origin }))).toBe(false);
    }
  });

  test("Origin も Referer もなければ通す（ブラウザ以外）", () => {
    expect(isSameOrigin(req({ host }))).toBe(true);
  });

  test("host がなければリクエストの URL のホストで見る", () => {
    expect(
      isSameOrigin(
        new Request("http://localhost:3000/api/x", {
          headers: { origin: "http://localhost:3000" },
        }),
      ),
    ).toBe(true);
    expect(
      isSameOrigin(
        new Request("http://localhost:3000/api/x", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).toBe(false);
  });
});

describe("isJsonContentType", () => {
  test("application/json（大文字小文字・charset を問わない）だけ", () => {
    expect(
      isJsonContentType(new Headers({ "content-type": "application/json" })),
    ).toBe(true);
    expect(
      isJsonContentType(
        new Headers({ "content-type": "Application/JSON; charset=UTF-8" }),
      ),
    ).toBe(true);
  });

  test("text/plain・フォーム・JSON に似た別の型・なしは断る", () => {
    for (const type of [
      "text/plain",
      "application/x-www-form-urlencoded",
      "multipart/form-data; boundary=x",
      "application/json-patch+json",
    ]) {
      expect(isJsonContentType(new Headers({ "content-type": type }))).toBe(
        false,
      );
    }
    expect(isJsonContentType(new Headers())).toBe(false);
  });
});
