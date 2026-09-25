import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createCommunitySupabaseMock } from "@/test/mocks/supabase-community";

const supabase = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => supabase.current,
}));

const { POST } = await import("./route");

const IP = "203.0.113.5";
const valid = {
  areaId: "10000000-0000-4000-8000-000000000001",
  name: "川沿いの小さな茶屋",
  category: "gourmet",
  description: "朝はほとんど人がいない",
  lat: 36.2,
  lng: 137.9,
  nickname: "はなこ",
};

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

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost/api/spot-submissions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": IP,
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/spot-submissions", () => {
  test("submit_spot() を呼び、201 と新しいスポットの id・「公開しました」を返す", async () => {
    const response = await post(valid);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: "20000000-0000-4000-8000-000000000099",
      message: "公開しました",
    });
    expect(mock.rpc).toHaveBeenCalledWith("submit_spot", {
      p_area_id: valid.areaId,
      p_name: valid.name,
      p_category: valid.category,
      p_description: valid.description,
      p_lat: valid.lat,
      p_lng: valid.lng,
      p_nickname: valid.nickname,
      p_client_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(JSON.stringify(mock.rpc.mock.calls)).not.toContain(IP);
  });

  test("レート制限のキーは submission:<16進64文字>、1時間に2件", async () => {
    await post(valid);
    expect(mock.rpc).toHaveBeenCalledWith("check_rate_limit", {
      p_key: expect.stringMatching(/^submission:[0-9a-f]{64}$/),
      p_window_seconds: 3600,
      p_max: 2,
    });
  });

  test("レート制限を超えたら 429 で、submit_spot() を呼ばない", async () => {
    mock.state.rateLimitAllowed = false;
    const response = await post(valid);
    expect(response.status).toBe(429);
    expect(mock.rpc).not.toHaveBeenCalledWith("submit_spot", expect.anything());
  });

  test("おとりの欄に値があれば、submit_spot() を呼ばずに同じ形の応答を返す", async () => {
    const response = await post({ ...valid, website: "spam" });
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      message: "公開しました",
    });
    expect(mock.rpc).not.toHaveBeenCalledWith("submit_spot", expect.anything());
  });

  test("別のオリジンからの POST は 403 で、数えず保存もしない（CSRF）", async () => {
    const response = await post(valid, { origin: "https://evil.example" });
    expect(response.status).toBe(403);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  test("Content-Type が text/plain の POST は 415 で、数えず保存もしない（CSRF）", async () => {
    const response = await post(valid, { "content-type": "text/plain" });
    expect(response.status).toBe(415);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  test.each([
    ["AN001", 400, "ng_word"],
    ["AN002", 400, "url"],
    ["AN003", 429, "duplicate"],
    ["AN004", 429, "busy"],
    ["23514", 400, "invalid_request"],
    ["23503", 400, "not_found"],
    ["22023", 400, "out_of_area"],
    ["42501", 503, "closed"],
    ["57014", 503, "busy"],
  ])("DB の %s は %i・%s に変える", async (code, status, error) => {
    mock.state.submitSpot = { error: { code } };
    const response = await post(valid);
    expect(response.status).toBe(status);
    expect((await response.json()).error).toBe(error);
  });

  test("レート制限の関数の権限が外れていたら（緊急停止）503", async () => {
    mock.state.rateLimitError = { code: "42501" };
    const response = await post(valid);
    expect(response.status).toBe(503);
    expect(mock.rpc).not.toHaveBeenCalledWith("submit_spot", expect.anything());
  });

  test.each([
    ["スポット名が41文字", { ...valid, name: "あ".repeat(41) }],
    ["カテゴリがない", { ...valid, category: "shopping" }],
    ["日本の外", { ...valid, lat: 0 }],
    ["source の指定", { ...valid, source: "seed" }],
  ])("%s は 400 で、数えず保存もしない", async (_label, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
});
