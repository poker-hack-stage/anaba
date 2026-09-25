// 口コミ・スポットの投稿の API（#52）が返すエラー。
// DB（#51 のトリガー・submit_spot()・check_rate_limit()）のエラーを、HTTP のステータスと利用者向けの短い日本語に変える。
// DB のメッセージはそのまま返さない（どの NG ワードに当たったかなど、内部の事情を出さないため）

export type ApiErrorBody = {
  /** 種類（画面が分岐に使う） */
  error: string;
  /** 利用者に見せる日本語 */
  message: string;
  /** 入力の検証で落ちた欄と理由（400 の invalid_request のときだけ） */
  fields?: Record<string, string>;
};

export type ApiError = { status: number; body: ApiErrorBody };

/** どの API のエラーか（同じ errcode でも、口コミと投稿で言い方が変わる） */
export type WriteKind = "review" | "submission";

export const INVALID_REQUEST: ApiError = {
  status: 400,
  body: { error: "invalid_request", message: "入力の内容を確かめてください" },
};

export const REQUEST_TOO_LARGE: ApiError = {
  status: 413,
  body: { error: "request_too_large", message: "送る内容が大きすぎます" },
};

export const RATE_LIMITED: ApiError = {
  status: 429,
  body: {
    error: "rate_limited",
    message: "続けて投稿されています。しばらくしてからお試しください",
  },
};

/** 受け付けを止めているとき（#55 の緊急停止・RATE_LIMIT_SALT の未設定） */
export const CLOSED: ApiError = {
  status: 503,
  body: { error: "closed", message: "いまは受け付けていません" },
};

const BUSY: ApiError = {
  status: 503,
  body: {
    error: "busy",
    message: "混み合っています。しばらくしてからお試しください",
  },
};

const INTERNAL: ApiError = {
  status: 500,
  body: {
    error: "internal",
    message: "うまくいきませんでした。しばらくしてからお試しください",
  },
};

/** Supabase（PostgREST）のエラーのうち、ここで見るところ */
export type DbError = { code?: string | null };

/**
 * DB のエラーを API のエラーに変える。知らない errcode は 500（呼ぶ側でログに残す）。
 * 22023（引数の形・場所の範囲）は、投稿では場所の範囲の外として 400、それ以外は API の不具合なので 500 にする
 */
export function toApiError(error: DbError, kind: WriteKind): ApiError {
  switch (error.code) {
    case "AN001":
      return bad("ng_word", "使えない言葉が含まれています");
    case "AN002":
      return bad("url", "URL は書けません");
    case "AN003":
      return {
        status: 429,
        body: {
          error: "duplicate",
          message:
            kind === "review"
              ? "同じ口コミがすでに投稿されています"
              : "同じスポットがすでに投稿されています",
        },
      };
    case "AN004":
      return {
        status: 429,
        body: {
          error: "busy",
          message: "投稿が混み合っています。しばらくしてからお試しください",
        },
      };
    case "23514":
      return INVALID_REQUEST;
    case "23503":
      return kind === "review"
        ? bad("not_found", "スポットが見つかりません")
        : bad("not_found", "地域が見つかりません");
    case "22023":
      return kind === "submission"
        ? bad("out_of_area", "場所が地域の範囲の外です")
        : INTERNAL;
    case "42501":
      return CLOSED;
    case "57014":
      return BUSY;
    default:
      return INTERNAL;
  }
}

/** 読み出し（GET）のエラー。書き込みの errcode は出ないので、時間切れだけを分ける */
export function toReadApiError(error: DbError): ApiError {
  return error.code === "57014" ? BUSY : INTERNAL;
}

/** check_rate_limit() のエラー。緊急停止（42501）と時間切れのほかは API の不具合（キーの形など）なので 500 */
export function toRateLimitApiError(error: DbError): ApiError {
  return error.code === "42501" ? CLOSED : toReadApiError(error);
}

/** 想定していないエラーか（呼ぶ側でログに残すかどうかに使う） */
export function isUnexpected(apiError: ApiError): boolean {
  return apiError.body.error === "internal";
}

function bad(error: string, message: string): ApiError {
  return { status: 400, body: { error, message } };
}

export function errorResponse(
  apiError: ApiError,
  headers?: HeadersInit,
): Response {
  return Response.json(apiError.body, { status: apiError.status, headers });
}
