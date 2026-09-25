// 口コミ・スポットの投稿の API（#52）で、ほかのサイトから送られた書き込み（CSRF）を断るための検査。
// ログインはないが、ほかのサイトを開いた人のブラウザから、その人の IP で書き込ませられると、
// IP ごとのレート制限をすり抜けられ、#55 で同じ送信元をまとめて非表示にするときに無関係の人が巻き込まれる

/**
 * 本文が JSON（メディアタイプが application/json）か。
 * text/plain・フォームの送信は preflight のない「単純なリクエスト」として、ほかのサイトから送れてしまう。
 * application/json に限れば、ほかのサイトからは preflight が要り、CORS を許していないので届かない
 */
export function isJsonContentType(headers: Headers): boolean {
  const mediaType = headers.get("content-type")?.split(";")[0]?.trim();
  return mediaType?.toLowerCase() === "application/json";
}

/**
 * 自サイトから送られたか。Origin（なければ Referer のオリジン）のホストが、リクエストのホストと同じなら自サイト。
 *
 * - 自サイトのホストは x-forwarded-host（なければ host、それもなければリクエストの URL）。ブラウザが開いているホストがそのまま入るので、
 *   Vercel の本番・プレビュー（デプロイごとの URL・ブランチの URL）・独自ドメインのどれでも、URL の一覧を持たずに済む
 * - 比べるのはホスト名とポートだけ（スキームは見ない）。TLS を前段で終える環境で、サーバーから見た
 *   スキームが http になっても、自サイトを誤って断らないため
 * - Origin も Referer もないときは通す。ブラウザはほかのサイトからの POST に必ず Origin を付けるので、
 *   ないのは curl などブラウザ以外。ブラウザ以外はヘッダーを好きに作れるので、断っても守りにならない
 * - `Origin: null`（sandbox の iframe など）や、読めない値は断る
 */
export function isSameOrigin(request: Request): boolean {
  const { headers } = request;
  const source = headers.get("origin") ?? headers.get("referer");
  if (source === null) return true;

  const host = (
    headers.get("x-forwarded-host") ??
    headers.get("host") ??
    new URL(request.url).host
  )
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (!host) return false;

  try {
    return new URL(source).host.toLowerCase() === host;
  } catch {
    return false;
  }
}
