import type { Spot } from "@/lib/data/spots";
import { pickRecommended } from "@/lib/spots/recommend";

/** キーワードの上限（検索欄の maxLength と同じ。#50） */
export const MAX_QUERY_LENGTH = 50;

/** 絞り込みに使う列だけのスポットの型（テストのフィクスチャを短く書けるように） */
export type FilterableSpot = Pick<
  Spot,
  "name" | "category" | "rating" | "tags" | "catchphrase" | "description"
>;

/** 絞り込みに使う列だけの地域の型。`AreaWithSpots` をそのまま渡せる */
export type FilterableArea<S extends FilterableSpot = FilterableSpot> = {
  name: string;
  /** 都道府県。列は #11 で足すので、それまでは無くてよい */
  prefecture?: string | null;
  spots: readonly S[];
  recommended: readonly S[];
};

export type AreaFilter = {
  /** 検索欄のキーワード。空白で区切った語はすべて含む（AND） */
  q?: string;
  /** 選んだカテゴリ（spots.category のキー）。どれかに当たればよい（OR） */
  categories?: readonly string[];
};

export type FilteredArea<A extends FilterableArea> = A & {
  /** 条件に一致したスポット（条件が空なら地域のすべてのスポット） */
  matchedSpots: A["spots"][number][];
  /** `matchedSpots` から選んだおすすめ（条件が空なら地域の今のおすすめのまま） */
  recommended: A["spots"][number][];
};

/**
 * 比べる前に文字をそろえる。NFKC で全角英数・半角カナをそろえ、英字を小文字に、カタカナをひらがなにする。
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/** キーワードを上限で切り、正規化して、空白で語に分ける */
export function parseKeywords(q: string | undefined): string[] {
  if (!q) return [];
  // 絵文字などサロゲートペアの途中で切れたら、半端な前半を落とす
  const truncated = q
    .slice(0, MAX_QUERY_LENGTH)
    .replace(/[\ud800-\udbff]$/, "");
  return normalizeText(truncated)
    .split(/\s+/)
    .filter((word) => word !== "");
}

/** 条件が入っているか（キーワードが空白だけ・カテゴリなしなら false） */
export function hasActiveFilter(filter: AreaFilter): boolean {
  return (
    parseKeywords(filter.q).length > 0 || (filter.categories?.length ?? 0) > 0
  );
}

/**
 * 「穴場を探す」の検索・カテゴリ絞り込み（docs/spec.md 画面-3）。Supabase は読まず、読み込み済みの地域を絞る。
 *
 * - 一致したスポットが1件以上ある地域だけを、渡された順（`display_order` 順）のまま返す
 * - 各地域の `recommended` は `matchedSpots` から #12 の基準で選び直す
 * - 条件が空なら全地域を返し、`recommended` は今のままにする
 * - 渡した配列・地域は書き換えない
 */
export function filterAreas<A extends FilterableArea>(
  areas: readonly A[],
  filter: AreaFilter,
): FilteredArea<A>[] {
  type S = A["spots"][number];
  const keywords = parseKeywords(filter.q);
  const categories = new Set(filter.categories ?? []);

  if (keywords.length === 0 && categories.size === 0) {
    return areas.map((area) => ({
      ...area,
      matchedSpots: [...area.spots],
      recommended: [...area.recommended],
    }));
  }

  const result: FilteredArea<A>[] = [];
  for (const area of areas) {
    const areaText = [area.name, area.prefecture ?? ""];
    const matchedSpots = area.spots.filter((spot: S) => {
      if (categories.size > 0 && !categories.has(spot.category)) return false;
      if (keywords.length === 0) return true;
      // 語に空白は含まれないので、改行でつないでも項目をまたいで一致しない
      const haystack = normalizeText(
        [
          ...areaText,
          spot.name,
          ...spot.tags,
          spot.catchphrase ?? "",
          spot.description ?? "",
        ].join("\n"),
      );
      return keywords.every((word) => haystack.includes(word));
    });

    if (matchedSpots.length === 0) continue;
    result.push({
      ...area,
      matchedSpots,
      recommended: pickRecommended(matchedSpots),
    });
  }
  return result;
}
