import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { DbError } from "./errors";

// スポットの口コミの読み出し（GET /api/spots/[id]/reviews、#52）

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** 公開してよい口コミ（published_reviews の列。client_hash・status は出ない） */
export type PublicReview = {
  id: string;
  spot_id: string;
  nickname: string;
  rating: number;
  body: string;
  created_at: string;
};

export type SpotReviews = {
  /** 新しい順に最大 REVIEWS_LIMIT 件 */
  reviews: PublicReview[];
  /** 公開している口コミの件数 */
  count: number;
  /** 星の平均（小数1桁）。口コミがなければ null */
  average: number | null;
};

export const REVIEWS_LIMIT = 20;

const RATINGS = [1, 2, 3, 4, 5] as const;

/**
 * 口コミの一覧と件数・平均。Supabase の PostgREST は集計（avg）が既定で無効なので、
 * 星ごとの件数を数えて件数と平均を出す（行を全部読まない）
 */
export async function getSpotReviews(
  supabase: SupabaseClient,
  spotId: string,
): Promise<
  { data: SpotReviews; error: null } | { data: null; error: DbError }
> {
  const [list, ...counts] = await Promise.all([
    supabase
      .from("published_reviews")
      .select("id, spot_id, nickname, rating, body, created_at")
      .eq("spot_id", spotId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(REVIEWS_LIMIT),
    ...RATINGS.map((rating) =>
      supabase
        .from("published_reviews")
        .select("*", { count: "exact", head: true })
        .eq("spot_id", spotId)
        .eq("rating", rating),
    ),
  ]);

  const error = list.error ?? counts.find((result) => result.error)?.error;
  if (error) return { data: null, error };

  return {
    data: {
      // ビューの列は型の上では null になりうるが、元の reviews の列はすべて not null
      reviews: list.data as PublicReview[],
      ...summarizeRatings(counts.map((result) => result.count ?? 0)),
    },
    error: null,
  };
}

/** 星ごとの件数（[★1, ★2, …, ★5]）から、件数と平均（小数1桁）を出す */
export function summarizeRatings(countsByRating: number[]): {
  count: number;
  average: number | null;
} {
  const count = countsByRating.reduce((sum, n) => sum + n, 0);
  if (count === 0) return { count, average: null };
  const total = countsByRating.reduce((sum, n, i) => sum + n * (i + 1), 0);
  // total * 10 は整数なので、割ってから10倍するより丸めの誤差が出にくい
  return { count, average: Math.round((total * 10) / count) / 10 };
}
