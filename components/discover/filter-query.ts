import { CATEGORIES, type SpotCategory } from "@/lib/spots/categories";
import { MAX_QUERY_LENGTH } from "@/lib/spots/filter";

/** 「穴場を探す」の絞り込み条件。URL のクエリ（`/?q=…&cat=onsen,view`）と1対1 */
export type DiscoverFilter = {
  q: string;
  categories: SpotCategory[];
};

export const EMPTY_FILTER: DiscoverFilter = { q: "", categories: [] };

/** 条件のクエリのキー */
const QUERY_KEYS = ["q", "cat"] as const;

const CATEGORY_KEYS = Object.keys(CATEGORIES) as SpotCategory[];

/** 条件のキーがクエリにあるか（`?q=` のように空でもあれば true） */
export function hasFilterQuery(params: URLSearchParams): boolean {
  return QUERY_KEYS.some((key) => params.has(key));
}

/**
 * URL のクエリから条件を読む。キーワードは上限で切り、知らないカテゴリ・重複は捨てる。
 * カテゴリは CATEGORIES の並びにそろえる（URL の並びに左右されないように）
 */
export function fromFilterQuery(params: URLSearchParams): DiscoverFilter {
  const q = (params.get("q") ?? "").slice(0, MAX_QUERY_LENGTH);
  const picked = new Set((params.get("cat") ?? "").split(","));
  return {
    q,
    categories: CATEGORY_KEYS.filter((key) => picked.has(key)),
  };
}

/**
 * 条件のキーだけを書き換えたクエリ文字列を返す（先頭の `?` なし）。ほかのキー（utm_source など）は残す。
 * 空の条件はキーごと消す。カテゴリの区切りの `,` は `%2C` にせずそのまま書く
 */
export function toFilterQuery(
  current: URLSearchParams,
  filter: DiscoverFilter,
): string {
  const params = new URLSearchParams(current);
  for (const key of QUERY_KEYS) params.delete(key);
  if (filter.q !== "") params.set("q", filter.q);
  if (filter.categories.length > 0) {
    params.set("cat", filter.categories.join(","));
  }
  return params.toString().replaceAll("%2C", ",");
}

export function isSameFilter(a: DiscoverFilter, b: DiscoverFilter): boolean {
  return a.q === b.q && a.categories.join(",") === b.categories.join(",");
}

// 最後の条件。「AI旅プラン」タブから戻ってきて URL にクエリがないときに使う。
// ブラウザでだけ書き換える（サーバーではリクエストをまたいで共有されてしまうため、effect・イベント・タイマーの中だけで書き換える）
let lastFilter: DiscoverFilter = EMPTY_FILTER;

export function getLastFilter(): DiscoverFilter {
  return lastFilter;
}

export function setLastFilter(filter: DiscoverFilter) {
  lastFilter = filter;
}
