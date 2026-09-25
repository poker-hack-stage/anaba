import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createCommunitySupabaseMock } from "@/test/mocks/supabase-community";

const supabase = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => supabase.current,
}));

const { GET, POST } = await import("./route");

const SPOT_ID = "20000000-0000-4000-8000-000000000001";
const IP = "203.0.113.5";
const valid = { nickname: "たろう", rating: 5, body: "静かでよかった" };

let mock: ReturnType<typeof createCommunitySupabaseMock>;

beforeEach(() => {
  mock = createCommunitySupabaseMock();
  supabase.current = mock.client;
  vi.stubEnv("RATE_LIMIT_SALT", "test-salt");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function post(body: unknown, id = SPOT_ID) {
  const request = new NextRequest(`http://localhost/api/spots/${id}/reviews`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": IP },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

function get(id = SPOT_ID) {
  const request = new NextRequest(`http://localhost/api/spots/${id}/reviews`);
  return GET(request, { params: Promise.resolve({ id }) });
}

describe("POST /api/spots/[id]/reviews", () => {
  test("口コミを保存し、201 と保存した口コミ（client_hash なし）を返す", async () => {
    const response = await post({ ...valid, body: " よかった\n\n\n\nまた " });

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json).toEqual({
      review: {
        spot_id: SPOT_ID,
        nickname: "たろう",
        rating: 5,
        body: "よかった\n\nまた",
      },
    });

    // DB には正規化した値とハッシュを入れる。生の IP は渡さない
    const inserted = mock.insert.mock.calls[0] as unknown[];
    expect(inserted[0]).toMatchObject({
      spot_id: SPOT_ID,
      body: "よかった\n\nまた",
      client_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(JSON.stringify(mock.rpc.mock.calls)).not.toContain(IP);
    expect(JSON.stringify(inserted)).not.toContain(IP);
  });

  test("応答に IP・ハッシュ・レート制限のキーが出ない", async () => {
    const response = await post(valid);
    const text = await response.text();
    const hash = (mock.insert.mock.calls[0] as unknown[])[0] as {
      client_hash: string;
    };
    expect(text).not.toContain(IP);
    expect(text).not.toContain(hash.client_hash);
    expect(text).not.toContain("review:");
    expect([...response.headers.values()].join(" ")).not.toContain(IP);
  });

  test("レート制限のキーは review:<16進64文字>、10分に3件", async () => {
    await post(valid);
    expect(mock.rpc).toHaveBeenCalledWith("check_rate_limit", {
      p_key: expect.stringMatching(/^review:[0-9a-f]{64}$/),
      p_window_seconds: 600,
      p_max: 3,
    });
  });

  test("レート制限を超えたら 429 と Retry-After を返し、保存しない", async () => {
    mock.state.rateLimitAllowed = false;
    const response = await post(valid);
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await response.json()).error).toBe("rate_limited");
    expect(mock.insert).not.toHaveBeenCalled();
  });

  test("おとりの欄に値があれば、保存せずに成功と同じ応答を返す", async () => {
    const honest = await (await post(valid)).json();
    mock.insert.mockClear();

    const response = await post({ ...valid, website: "https://spam.example" });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(honest);
    expect(mock.insert).not.toHaveBeenCalled();
  });

  test.each([
    ["AN001", 400, "ng_word"],
    ["AN002", 400, "url"],
    ["AN003", 429, "duplicate"],
    ["AN004", 429, "busy"],
    ["23514", 400, "invalid_request"],
    ["23503", 400, "not_found"],
    ["42501", 503, "closed"],
    ["57014", 503, "busy"],
  ])("DB の %s は %i・%s に変える", async (code, status, error) => {
    mock.state.insertError = { code, message: "DB の内部のメッセージ" };
    const response = await post(valid);
    expect(response.status).toBe(status);
    const json = await response.json();
    expect(json.error).toBe(error);
    expect(json.message).not.toContain("DB の内部のメッセージ");
  });

  test("想定していない DB のエラーは 500 にし、ログに IP・ハッシュを書かない", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mock.state.insertError = { code: "XX000", message: "boom" };
    const response = await post(valid);
    expect(response.status).toBe(500);
    expect(log).toHaveBeenCalledOnce();
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain(IP);
    expect(logged).not.toMatch(/[0-9a-f]{64}/);
  });

  test.each([
    ["上限を超える本文", { ...valid, body: "あ".repeat(301) }],
    ["星が範囲外", { ...valid, rating: 6 }],
    ["JSON でない", "{nickname:"],
    ["status の指定", { ...valid, status: "hidden" }],
  ])("%s は 400 で、数えず保存もしない", async (_label, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("invalid_request");
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(mock.insert).not.toHaveBeenCalled();
  });

  test("入力のエラーは欄ごとの理由を返す", async () => {
    const response = await post({ ...valid, nickname: "あ".repeat(21) });
    expect((await response.json()).fields).toEqual({
      nickname: "ニックネームは20文字以内にしてください",
    });
  });

  test("スポットの id が uuid でなければ 400", async () => {
    const response = await post(valid, "not-a-uuid");
    expect(response.status).toBe(400);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  test("大きすぎる本文は 413", async () => {
    const response = await post({ ...valid, website: "x".repeat(9_000) });
    expect(response.status).toBe(413);
  });

  test("本番で RATE_LIMIT_SALT が未設定なら 503 で受け付けない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("RATE_LIMIT_SALT", "");
    vi.stubEnv("NODE_ENV", "production");
    const response = await post(valid);
    expect(response.status).toBe(503);
    expect((await response.json()).message).toBe("いまは受け付けていません");
    expect(mock.insert).not.toHaveBeenCalled();
  });
});

describe("GET /api/spots/[id]/reviews", () => {
  test("口コミの一覧・件数・平均（小数1桁）を返す", async () => {
    const reviews = [
      {
        id: "30000000-0000-4000-8000-000000000001",
        spot_id: SPOT_ID,
        nickname: "たろう",
        rating: 5,
        body: "よかった",
        created_at: "2026-09-25T00:00:00Z",
      },
    ];
    mock.state.reviews = reviews;
    mock.state.ratingCounts = [0, 0, 1, 0, 2];

    const response = await get();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      reviews,
      count: 3,
      average: 4.3,
    });
    expect(mock.from).toHaveBeenCalledWith("published_reviews");
    expect(mock.from).not.toHaveBeenCalledWith("reviews");
  });

  test("口コミがなければ件数0・平均 null", async () => {
    expect(await (await get()).json()).toEqual({
      reviews: [],
      count: 0,
      average: null,
    });
  });

  test("スポットの id が uuid でなければ 400", async () => {
    expect((await get("x")).status).toBe(400);
  });
});
