// スポットの評価（星）と穴場度の読み出し（#29）。
// 値の意味と付け方は docs/spot-scores.md。spots.rating / spots.hidden_gem_score を直接読まず、ここを通す
import type { Spot } from "@/lib/data/spots";

/** 穴場度（1〜5 の整数） */
export type HiddenGemScore = 1 | 2 | 3 | 4 | 5;

export const RATING_MIN = 0;
export const RATING_MAX = 5;
export const HIDDEN_GEM_SCORE_MIN = 1;
export const HIDDEN_GEM_SCORE_MAX = 5;

/**
 * 評価（0〜5、小数1桁）。値がない・範囲外のときは null（表示しない）
 * DB の check 制約と同じ範囲だが、手で入れたデータやモックに備えてここでも確かめる
 */
export function getRating(spot: Pick<Spot, "rating">): number | null {
  const { rating } = spot;
  if (rating === null || !Number.isFinite(rating)) return null;
  if (rating < RATING_MIN || rating > RATING_MAX) return null;
  return rating;
}

/** 穴場度（1〜5 の整数）。値がない・範囲外・整数でないときは null（表示しない） */
export function getHiddenGemScore(
  spot: Pick<Spot, "hidden_gem_score">,
): HiddenGemScore | null {
  const score = spot.hidden_gem_score;
  if (score === null || !Number.isInteger(score)) return null;
  if (score < HIDDEN_GEM_SCORE_MIN || score > HIDDEN_GEM_SCORE_MAX) {
    return null;
  }
  return score as HiddenGemScore;
}

/** 評価を「4.5」のように小数1桁で表す */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/** 評価の高い順に並べる比較関数。評価がないスポットは、評価 0 のスポットより後ろ */
export function compareByRating(
  a: Pick<Spot, "rating">,
  b: Pick<Spot, "rating">,
): number {
  return (getRating(b) ?? -1) - (getRating(a) ?? -1);
}

/** 穴場度の高い順に並べる比較関数。穴場度がないスポットは後ろ */
export function compareByHiddenGemScore(
  a: Pick<Spot, "hidden_gem_score">,
  b: Pick<Spot, "hidden_gem_score">,
): number {
  return (getHiddenGemScore(b) ?? 0) - (getHiddenGemScore(a) ?? 0);
}
