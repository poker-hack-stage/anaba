import type { Spot } from "@/lib/data/spots";
import { compareByRating } from "@/lib/spots/score";

/** 情報パネルに並べるおすすめの件数 */
export const RECOMMENDED_COUNT = 3;

/** おすすめ選定に使う列だけの型（テストのフィクスチャを短く書けるように） */
export type RecommendableSpot = Pick<Spot, "name" | "category" | "rating">;

/**
 * 地域のスポットからおすすめを選ぶ。Supabase は読まない。
 *
 * 基準（#29 の評価・穴場度の基準が決まるまでの仮）:
 * 1. 評価 `rating` の高い順。`null` は評価のあるスポットより後ろ
 * 2. 評価が同じなら `name` の順（DB から返る順に左右されないように）
 * 3. カテゴリがかぶらないように、上の順で、まだ選んでいないカテゴリのスポットを先に取る。
 *    カテゴリの種類が足りず `count` 件に届かないときは、残りを上の順で埋める
 * 4. スポットが `count` 件未満なら、ある分だけ返す
 *
 * TODO(#12): 評価より前に穴場度の高い順で並べる（`compareByHiddenGemScore`（`lib/spots/score.ts`）を使う）
 */
export function pickRecommended<T extends RecommendableSpot>(
  spots: readonly T[],
  count = RECOMMENDED_COUNT,
): T[] {
  const sorted = [...spots].sort(compareSpots);

  const picked: T[] = [];
  const usedCategories = new Set<string>();
  for (const spot of sorted) {
    if (picked.length >= count) break;
    if (usedCategories.has(spot.category)) continue;
    picked.push(spot);
    usedCategories.add(spot.category);
  }

  for (const spot of sorted) {
    if (picked.length >= count) break;
    if (!picked.includes(spot)) picked.push(spot);
  }

  return picked;
}

function compareSpots(a: RecommendableSpot, b: RecommendableSpot): number {
  return compareByRating(a, b) || a.name.localeCompare(b.name, "ja");
}
