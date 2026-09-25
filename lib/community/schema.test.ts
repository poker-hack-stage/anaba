import { describe, expect, test } from "vitest";

import {
  countChars,
  isHoneypotFilled,
  normalizeText,
  reviewInputSchema,
  spotSubmissionInputSchema,
} from "./schema";

const review = { nickname: "たろう", rating: 4, body: "静かでよかった" };

const submission = {
  areaId: "10000000-0000-4000-8000-000000000001",
  name: "川沿いの小さな茶屋",
  category: "gourmet",
  description: "朝はほとんど人がいない",
  lat: 36.2,
  lng: 137.9,
  nickname: "はなこ",
};

describe("normalizeText", () => {
  test("前後の空白を削り、改行を \\n にそろえる", () => {
    expect(normalizeText("  \u3000よかった\r\nまた行く\r ")).toBe(
      "よかった\nまた行く",
    );
  });

  test("続く改行は2つまでに詰める（空白・見えない文字だけの行も続く改行として数える）", () => {
    expect(normalizeText("a\n\n\nb")).toBe("a\n\nb");
    expect(normalizeText("a\n \n\u3000\n\u200b\n\nb")).toBe("a\n\nb");
    expect(normalizeText("a\u2028\u2029\u2028b")).toBe("a\n\nb");
    expect(normalizeText("a\n\nb")).toBe("a\n\nb");
  });
});

describe("countChars", () => {
  test("コードポイントで数える（DB の char_length と同じ）", () => {
    expect(countChars("🍵")).toBe(1);
    expect(countChars("あいう")).toBe(3);
  });
});

describe("reviewInputSchema", () => {
  test("正しい口コミを受け付け、正規化した値を返す", () => {
    expect(
      reviewInputSchema.parse({
        ...review,
        nickname: " たろう ",
        body: "よかった\n\n\n\nまた行く",
      }),
    ).toEqual({ ...review, body: "よかった\n\nまた行く" });
  });

  test("上限ちょうどは受け付ける（絵文字も1文字）", () => {
    expect(
      reviewInputSchema.safeParse({
        ...review,
        nickname: "🍵".repeat(20),
        body: "あ".repeat(300),
      }).success,
    ).toBe(true);
  });

  test.each([
    ["ニックネームが21文字", { nickname: "あ".repeat(21) }],
    ["本文が301文字", { body: "あ".repeat(301) }],
    ["本文が絵文字301文字", { body: "🍵".repeat(301) }],
    ["ニックネームが空", { nickname: "" }],
    ["ニックネームが空白だけ", { nickname: " \u3000 " }],
    ["本文が見えない文字だけ", { body: "\u200b\u200b\ufeff" }],
    ["ニックネームに改行", { nickname: "た\nろう" }],
    ["向きの制御文字", { body: "よかった\u202e" }],
    ["NUL", { body: "よ\u0000かった" }],
    ["星が0", { rating: 0 }],
    ["星が6", { rating: 6 }],
    ["星が小数", { rating: 3.5 }],
    ["星が文字列", { rating: "5" }],
    ["余計な項目", { status: "hidden" }],
    ["client_hash を指定", { client_hash: "a".repeat(64) }],
  ])("%s は拒否する", (_label, patch) => {
    expect(reviewInputSchema.safeParse({ ...review, ...patch }).success).toBe(
      false,
    );
  });

  test("項目が足りなければ拒否する", () => {
    expect(reviewInputSchema.safeParse({ rating: 5 }).success).toBe(false);
  });
});

describe("spotSubmissionInputSchema", () => {
  test("正しい投稿を受け付ける", () => {
    expect(spotSubmissionInputSchema.parse(submission)).toEqual(submission);
  });

  test.each([
    ["スポット名が41文字", { name: "あ".repeat(41) }],
    ["ひとことが301文字", { description: "あ".repeat(301) }],
    ["スポット名に改行", { name: "茶屋\n本店" }],
    ["ひとことが見えない文字だけ", { description: "\u200b \u2060" }],
    ["カテゴリが6種にない", { category: "shopping" }],
    ["地域の id が uuid でない", { areaId: "matsumoto" }],
    ["緯度が日本の外", { lat: 10 }],
    ["経度が日本の外", { lng: 160 }],
    ["緯度が文字列", { lat: "36.2" }],
    ["余計な項目", { source: "seed" }],
  ])("%s は拒否する", (_label, patch) => {
    expect(
      spotSubmissionInputSchema.safeParse({ ...submission, ...patch }).success,
    ).toBe(false);
  });
});

describe("isHoneypotFilled", () => {
  test("おとりの欄に値があれば true", () => {
    expect(isHoneypotFilled({ website: "https://example.com" })).toBe(true);
  });

  test("文字列でない値（数値・真偽値・オブジェクト）も入っているとみなす", () => {
    expect(isHoneypotFilled({ website: 1 })).toBe(true);
    expect(isHoneypotFilled({ website: false })).toBe(true);
    expect(isHoneypotFilled({ website: {} })).toBe(true);
  });

  test("おとりの欄はどんな型でも検証で落とさない（ボットに気づかせない）", () => {
    expect(reviewInputSchema.safeParse({ ...review, website: 1 }).success).toBe(
      true,
    );
  });

  test("欄がない・空・空白だけなら false", () => {
    expect(isHoneypotFilled({})).toBe(false);
    expect(isHoneypotFilled({ website: "" })).toBe(false);
    expect(isHoneypotFilled({ website: "  " })).toBe(false);
    expect(isHoneypotFilled({ website: null })).toBe(false);
  });
});
