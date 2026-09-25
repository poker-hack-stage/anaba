import { vi } from "vitest";

// 口コミ・投稿の API（#52）のテスト用の、Supabase のサーバー用クライアントの差し替え。
// rpc と insert の呼び出しを記録し、決めた結果を返す

type DbResult = { data?: unknown; error?: { code: string; message?: string } };

export function createCommunitySupabaseMock() {
  const state = {
    /** check_rate_limit() が返す値（true = 上限以内） */
    rateLimitAllowed: true as boolean,
    rateLimitError: null as DbResult["error"] | null,
    insertError: null as DbResult["error"] | null,
    submitSpot: { data: "20000000-0000-4000-8000-000000000099" } as DbResult,
    /** published_reviews の一覧と、星ごとの件数（[★1, …, ★5]） */
    reviews: [] as unknown[],
    ratingCounts: [0, 0, 0, 0, 0],
  };

  const rpc = vi.fn(async (name: string) => {
    if (name === "check_rate_limit") {
      return state.rateLimitError
        ? { data: null, error: state.rateLimitError }
        : { data: state.rateLimitAllowed, error: null };
    }
    if (name === "submit_spot") {
      return {
        data: state.submitSpot.data ?? null,
        error: state.submitSpot.error ?? null,
      };
    }
    throw new Error(`想定していない rpc: ${name}`);
  });

  const insert = vi.fn(async () => ({ error: state.insertError }));

  const from = vi.fn((table: string) => {
    if (table === "reviews") return { insert };
    if (table === "published_reviews") return readQuery();
    throw new Error(`想定していないテーブル: ${table}`);
  });

  function readQuery() {
    let head = false;
    let rating: number | null = null;
    const query = {
      select: (_columns: string, options?: { head?: boolean }) => {
        head = options?.head ?? false;
        return query;
      },
      eq: (column: string, value: unknown) => {
        if (column === "rating") rating = value as number;
        return query;
      },
      order: () => query,
      limit: () => query,
      then: (resolve: (result: unknown) => void) =>
        resolve(
          head
            ? { count: state.ratingCounts[(rating ?? 1) - 1], error: null }
            : { data: state.reviews, error: null },
        ),
    };
    return query;
  }

  return { client: { rpc, from }, state, rpc, insert, from };
}
