import "server-only";
import { createHmac } from "node:crypto";

// 送信元（IP）のハッシュ（#52）。レート制限のキーと、DB の client_hash（管理者が同じ送信元の書き込みを
// まとめて非表示にするとき、#55）に使う。生の IP は保存もログ出力もしない

/** RATE_LIMIT_SALT がない開発環境で使う値。本番（NODE_ENV=production）では使わない */
const DEV_SALT = "anaba-dev-only-rate-limit-salt";

let warnedDevSalt = false;

/**
 * ハッシュに使う salt。RATE_LIMIT_SALT が空のとき、本番では null（呼ぶ側が受け付けを止める）、
 * 開発では固定の値を返す。salt がないと、IPv4 は約43億通りしかないので、ハッシュから IP を総当たりで戻せる
 */
export function getRateLimitSalt(): string | null {
  const salt = process.env.RATE_LIMIT_SALT?.trim();
  if (salt) return salt;
  if (process.env.NODE_ENV === "production") return null;
  if (!warnedDevSalt) {
    warnedDevSalt = true;
    console.warn(
      "RATE_LIMIT_SALT が未設定なので、開発用の固定の値を使います（本番では投稿を受け付けません）",
    );
  }
  return DEV_SALT;
}

let warnedUnknownIp = false;

/**
 * 送信元の IP。x-forwarded-for の先頭（Vercel はここに接続元の IP を入れ、利用者が送った値を上書きする）。
 * なければ x-real-ip、どちらもなければ "unknown"（すべて同じ送信元として数える。制限を外すより安全なため）。
 * Vercel では必ず付くので、ないときは Vercel 以外に置いたと気づけるよう、一度だけ警告を出す
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  if (!warnedUnknownIp) {
    warnedUnknownIp = true;
    console.warn(
      "x-forwarded-for・x-real-ip がないので、すべての送信元を1つとしてレート制限を数えます（Vercel の外に置いていないか確かめてください）",
    );
  }
  return "unknown";
}

/** IP と salt から作る HMAC-SHA256（16進小文字64文字。DB の check_rate_limit() が受け付ける形） */
export function hashClient(ip: string, salt: string): string {
  return createHmac("sha256", salt).update(ip).digest("hex");
}
