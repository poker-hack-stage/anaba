import { afterEach, describe, expect, test, vi } from "vitest";
import {
  NICKNAME_STORAGE_KEY,
  formatReviewDate,
  loadNickname,
  readApiError,
  saveNickname,
} from "./review-client";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("loadNickname・saveNickname", () => {
  test("覚えたニックネームを読み出す", () => {
    saveNickname("松本の人");
    expect(window.localStorage.getItem(NICKNAME_STORAGE_KEY)).toBe("松本の人");
    expect(loadNickname()).toBe("松本の人");
  });

  test("覚えていなければ空", () => {
    expect(loadNickname()).toBe("");
  });

  test("ストレージを使えなくても例外にしない（読めなければ空）", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => saveNickname("a")).not.toThrow();
    expect(loadNickname()).toBe("");
  });
});

describe("formatReviewDate", () => {
  test("日本時間の日付で出す（UTC では前の日でも）", () => {
    expect(formatReviewDate("2026-09-24T16:00:00Z")).toBe("2026/9/25");
  });

  test("読めない値なら空", () => {
    expect(formatReviewDate("not a date")).toBe("");
  });
});

describe("readApiError", () => {
  test("API の本文（error・message・fields）をそのまま使う", async () => {
    const res = Response.json(
      {
        error: "invalid_request",
        message: "入力の内容を確かめてください",
        fields: { body: "口コミを入力してください" },
      },
      { status: 400 },
    );
    expect(await readApiError(res)).toEqual({
      error: "invalid_request",
      message: "入力の内容を確かめてください",
      fields: { body: "口コミを入力してください" },
    });
  });

  test("本文が JSON でない 429 は、続けて投稿された旨の文にする", async () => {
    const res = new Response("Too Many Requests", { status: 429 });
    expect(await readApiError(res)).toEqual({
      error: "unknown",
      message: "続けて投稿されています。しばらくしてからお試しください",
    });
  });

  test("message のない本文は、ほかのエラーの文にする", async () => {
    const res = Response.json({ oops: true }, { status: 502 });
    expect((await readApiError(res)).message).toBe(
      "うまくいきませんでした。しばらくしてからお試しください",
    );
  });
});
