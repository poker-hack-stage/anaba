import type { ApiErrorBody } from "./errors";

// 口コミ欄（#53）の画面で使う、ブラウザ側の小さな関数。API（#52）の応答の読み方とニックネームの記憶

/** ニックネームを覚えておく localStorage のキー（投稿フォーム #54 でも同じものを使う） */
export const NICKNAME_STORAGE_KEY = "anaba:nickname";

/** 覚えたニックネーム。読めない（プライベートブラウズ・ストレージの無効化など）ときは空 */
export function loadNickname(): string {
  try {
    return window.localStorage.getItem(NICKNAME_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/** ニックネームを覚える。書けないときは何もしない（次回は空から始まるだけ） */
export function saveNickname(nickname: string): void {
  try {
    window.localStorage.setItem(NICKNAME_STORAGE_KEY, nickname);
  } catch {
    // 覚えられなくても投稿はできているので、利用者には知らせない
  }
}

const DATE_FORMAT = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

/** 口コミの日付（例: 2026/9/25）。日本時間で出す。読めない値なら空 */
export function formatReviewDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DATE_FORMAT.format(date);
}

export const NETWORK_ERROR_MESSAGE =
  "送れませんでした。通信の状態を確かめて、もう一度お試しください";

/**
 * API のエラーの応答の本文を読む。形が違う（HTML のエラーページなど）ときは、
 * ステータスから決めた文にする。欄ごとの理由（fields）は、400 の入力のエラーのときだけ付く
 */
export async function readApiError(res: Response): Promise<ApiErrorBody> {
  const fallback: ApiErrorBody = {
    error: "unknown",
    message:
      res.status === 429
        ? "続けて投稿されています。しばらくしてからお試しください"
        : "うまくいきませんでした。しばらくしてからお試しください",
  };
  try {
    const body: unknown = await res.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
    ) {
      const { error, fields } = body as Partial<ApiErrorBody>;
      return {
        error: typeof error === "string" ? error : fallback.error,
        message: body.message,
        ...(fields && typeof fields === "object" && { fields }),
      };
    }
  } catch {
    // JSON でない
  }
  return fallback;
}
