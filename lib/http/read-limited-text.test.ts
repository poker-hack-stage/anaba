// @vitest-environment node
// Request の本文（ストリーム）を読むので、jsdom ではなく node で動かす

import { describe, expect, test, vi } from "vitest";

import { readLimitedText } from "./read-limited-text";

function post(body: BodyInit, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/plan", {
    method: "POST",
    body,
    headers,
    // ReadableStream を本文にするときに必要
    duplex: "half",
  } as RequestInit);
}

/** 少しずつ本文を流すストリーム。読まれた回数を数える */
function chunkedStream(chunk: string, count: number) {
  const pull = vi.fn();
  let sent = 0;
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        pull();
        if (sent++ < count) controller.enqueue(new TextEncoder().encode(chunk));
        else controller.close();
      },
    },
    // 作っただけで先読みしないようにする（読まれた回数を正しく数えるため）
    { highWaterMark: 0 },
  );
  return { stream, pull };
}

describe("readLimitedText", () => {
  test("上限以内なら本文を文字列で返す（日本語もそのまま）", async () => {
    expect(await readLimitedText(post('{"area":"松本市"}'), 100)).toBe(
      '{"area":"松本市"}',
    );
  });

  test("本文がなければ空文字を返す", async () => {
    expect(await readLimitedText(new Request("http://localhost/"), 100)).toBe(
      "",
    );
  });

  test("上限はバイト数で数える（日本語は1文字3バイト）", async () => {
    expect(await readLimitedText(post("あいう"), 9)).toBe("あいう");
    expect(await readLimitedText(post("あいう"), 8)).toBeNull();
  });

  test("Content-Length が上限を超えていたら、本文を読まずに null を返す", async () => {
    const { stream, pull } = chunkedStream("a", 1);

    expect(
      await readLimitedText(post(stream, { "content-length": "101" }), 100),
    ).toBeNull();
    expect(pull).not.toHaveBeenCalled();
  });

  test("読みながら上限を超えたら、その時点で読むのをやめて null を返す", async () => {
    const { stream, pull } = chunkedStream("a".repeat(10), 1000);

    expect(await readLimitedText(post(stream), 25)).toBeNull();
    // 1000回分ではなく、上限を超えるところまでしか読まない
    expect(pull.mock.calls.length).toBeLessThan(10);
  });
});
