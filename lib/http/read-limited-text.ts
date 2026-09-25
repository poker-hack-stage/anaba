/**
 * リクエストの本文を、上限（バイト数）までだけ読んで文字列にする。上限を超えたら null。
 * request.text() は本文を全部読んでからでないと長さを確かめられないので、大きな本文を送られるとその分メモリを使う。
 * ここでは Content-Length を先に見て、さらに読みながら上限を超えた時点で読むのをやめる
 */
export async function readLimitedText(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
