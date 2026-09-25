import { describe, expect, test } from "vitest";

import {
  isUnexpected,
  toApiError,
  toRateLimitApiError,
  toReadApiError,
} from "./errors";

describe("toApiError", () => {
  test.each([
    ["AN001", "review", 400, "ng_word"],
    ["AN002", "submission", 400, "url"],
    ["AN003", "review", 429, "duplicate"],
    ["AN004", "submission", 429, "busy"],
    ["23514", "review", 400, "invalid_request"],
    ["23503", "review", 400, "not_found"],
    ["23503", "submission", 400, "not_found"],
    ["22023", "submission", 400, "out_of_area"],
    ["22023", "review", 500, "internal"],
    ["42501", "review", 503, "closed"],
    ["57014", "submission", 503, "busy"],
    ["PGRST301", "review", 500, "internal"],
    [undefined, "review", 500, "internal"],
  ] as const)("%s（%s）は %i・%s", (code, kind, status, error) => {
    const apiError = toApiError({ code }, kind);
    expect(apiError.status).toBe(status);
    expect(apiError.body.error).toBe(error);
    expect(apiError.body.message).not.toBe("");
  });

  test("NG ワードのエラーは、どの語に当たったかを返さない", () => {
    const apiError = toApiError(
      { code: "AN001", message: "使えない言葉が含まれています: 死ね" } as {
        code: string;
      },
      "review",
    );
    expect(JSON.stringify(apiError.body)).not.toContain("死ね");
  });

  test("連投のメッセージは口コミと投稿で変える", () => {
    expect(toApiError({ code: "AN003" }, "review").body.message).toContain(
      "口コミ",
    );
    expect(toApiError({ code: "AN003" }, "submission").body.message).toContain(
      "スポット",
    );
  });

  test("緊急停止（42501）は「いまは受け付けていません」", () => {
    expect(toApiError({ code: "42501" }, "submission").body.message).toBe(
      "いまは受け付けていません",
    );
  });
});

describe("toReadApiError・toRateLimitApiError", () => {
  test("時間切れは 503、ほかは 500", () => {
    expect(toReadApiError({ code: "57014" }).status).toBe(503);
    expect(toReadApiError({ code: "42P01" }).status).toBe(500);
  });

  test("レート制限の関数の 22023 は API の不具合なので 500、42501 は 503", () => {
    expect(toRateLimitApiError({ code: "22023" }).status).toBe(500);
    expect(toRateLimitApiError({ code: "42501" }).status).toBe(503);
  });
});

describe("isUnexpected", () => {
  test("500 だけをログに残す対象にする", () => {
    expect(isUnexpected(toApiError({ code: "XX000" }, "review"))).toBe(true);
    expect(isUnexpected(toApiError({ code: "42501" }, "review"))).toBe(false);
    expect(isUnexpected(toApiError({ code: "AN001" }, "review"))).toBe(false);
  });
});
