import { z } from "zod";
import { CATEGORIES, type SpotCategory } from "@/lib/spots/categories";

// 口コミ・スポットの投稿の API（#52）の入力の検証。
// 上限と拒否する入力は DB（#51 の check 制約・トリガー・submit_spot()）と同じにし、DB に送る前に 400 で返す。
// DB も同じ検査をするので、ここをすり抜けた入力も保存はされない（DB のエラーは errors.ts で変換する）

/** リクエストの本文の上限（バイト数）。300文字の本文をすべて \uXXXX で書いても収まる */
export const MAX_REQUEST_BYTES = 8_000;

export const LIMITS = {
  nickname: 20,
  body: 300,
  name: 40,
  description: 300,
} as const;

/**
 * 見えない文字（DB の normalize_for_moderation() が消す文字と同じ。改行・タブを除く）。
 * これと空白だけの入力は空として扱う
 */
const INVISIBLE =
  "[\\x01-\\x08\\x0b-\\x1f\\x7f-\\x9f\\u00ad\\u034f\\u061c\\u115f\\u1160\\u17b4\\u17b5\\u180b-\\u180f\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u206f\\u2800\\u3164\\ufe00-\\ufe0f\\ufeff\\uffa0\\u{e0000}-\\u{e007f}]";
const INVISIBLE_OR_SPACE = new RegExp(`(?:\\s|${INVISIBLE})`, "gu");
/** 改行が3つ以上、空白や見えない文字だけをはさんで続くところ */
const EXCESS_NEWLINES = new RegExp(
  `\\n(?:(?:[^\\S\\n]|${INVISIBLE})*\\n){2,}`,
  "gu",
);
/** 文字の向きを変える制御文字（DB の assert_no_bidi_control() と同じ） */
const BIDI_CONTROL = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
/** 改行・タブ以外の制御文字。NUL は Postgres の text に入らず、ほかも表示を崩すだけなので受け付けない */
const CONTROL = /[\x00-\x08\x0b-\x1f\x7f-\x9f]/u;

/** 改行を \n にそろえ、前後の空白を削り、続く改行を2つまでに詰める */
export function normalizeText(value: string): string {
  return value
    .replace(/\r\n?|[\u0085\u2028\u2029\v\f]/g, "\n")
    .trim()
    .replace(EXCESS_NEWLINES, "\n\n");
}

/** 文字数。DB の char_length と同じく、コードポイントで数える（絵文字1つを2と数えない） */
export function countChars(value: string): number {
  return [...value].length;
}

function hasVisibleChar(value: string): boolean {
  return value.replace(INVISIBLE_OR_SPACE, "") !== "";
}

function text(label: string, max: number, { multiline = false } = {}) {
  return z
    .string({ error: `${label}を入力してください` })
    .transform(normalizeText)
    .refine(hasVisibleChar, `${label}を入力してください`)
    .refine(
      (value) => countChars(value) <= max,
      `${label}は${max}文字以内にしてください`,
    )
    .refine(
      (value) => multiline || !value.includes("\n"),
      `${label}に改行は入れられません`,
    )
    .refine(
      (value) => !BIDI_CONTROL.test(value),
      "文字の向きを変える制御文字は使えません",
    )
    .refine((value) => !CONTROL.test(value), "使えない文字が含まれています");
}

/**
 * おとり（ハニーポット）の欄。画面には出さないので、人が送るときは空になる。
 * 値の中身は見ないが、極端に長いものは本文の上限で止まる
 */
const honeypot = z.string().optional();

const RATING_ERROR = "星は1〜5で選んでください";

/** 口コミ（POST /api/spots/[id]/reviews） */
export const reviewInputSchema = z.strictObject({
  nickname: text("ニックネーム", LIMITS.nickname),
  rating: z
    .int({ error: RATING_ERROR })
    .min(1, RATING_ERROR)
    .max(5, RATING_ERROR),
  body: text("口コミ", LIMITS.body, { multiline: true }),
  website: honeypot,
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;

const CATEGORY_KEYS = Object.keys(CATEGORIES) as [
  SpotCategory,
  ...SpotCategory[],
];

/** 日本のおおよその範囲（DB の submit_spot() と同じ）。地域の範囲の中かは DB が確かめる */
const OUT_OF_JAPAN = "場所が日本の範囲の外です";

/** スポットの投稿（POST /api/spot-submissions） */
export const spotSubmissionInputSchema = z.strictObject({
  areaId: z.guid({ error: "地域を選んでください" }),
  name: text("スポット名", LIMITS.name),
  category: z.enum(CATEGORY_KEYS, { error: "カテゴリを選んでください" }),
  description: text("ひとこと", LIMITS.description, { multiline: true }),
  lat: z
    .number({ error: "場所を選んでください" })
    .min(20, OUT_OF_JAPAN)
    .max(46, OUT_OF_JAPAN),
  lng: z
    .number({ error: "場所を選んでください" })
    .min(122, OUT_OF_JAPAN)
    .max(154, OUT_OF_JAPAN),
  nickname: text("ニックネーム", LIMITS.nickname),
  website: honeypot,
});

export type SpotSubmissionInput = z.infer<typeof spotSubmissionInputSchema>;

/** パスの id（スポットの id）。形の違う値を DB に送らない */
export const spotIdSchema = z.guid();

/** おとりの欄に値があるか（あればボットとみなし、保存せずに成功と同じ応答を返す） */
export function isHoneypotFilled(input: { website?: string }): boolean {
  return (input.website ?? "").trim() !== "";
}
