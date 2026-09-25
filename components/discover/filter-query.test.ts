import { describe, expect, test } from "vitest";

import { MAX_QUERY_LENGTH } from "@/lib/spots/filter";
import {
  EMPTY_FILTER,
  fromFilterQuery,
  hasFilterQuery,
  isSameFilter,
  toFilterQuery,
} from "./filter-query";

describe("fromFilterQuery", () => {
  test("キーワードとカテゴリを読む", () => {
    expect(
      fromFilterQuery(new URLSearchParams("q=温泉&cat=onsen,view")),
    ).toEqual({ q: "温泉", categories: ["view", "onsen"] });
  });

  test("クエリがなければ空の条件", () => {
    expect(fromFilterQuery(new URLSearchParams(""))).toEqual(EMPTY_FILTER);
  });

  test("知らないカテゴリ・空文字・重複は捨て、CATEGORIES の並びにそろえる", () => {
    expect(
      fromFilterQuery(new URLSearchParams("cat=history,,foo,gourmet,history"))
        .categories,
    ).toEqual(["gourmet", "history"]);
  });

  test("キーワードは上限で切る", () => {
    const q = "あ".repeat(MAX_QUERY_LENGTH + 10);
    expect(fromFilterQuery(new URLSearchParams({ q })).q).toHaveLength(
      MAX_QUERY_LENGTH,
    );
  });
});

describe("toFilterQuery", () => {
  test("カテゴリの区切りはそのまま書く", () => {
    expect(
      toFilterQuery(new URLSearchParams(), {
        q: "わさび",
        categories: ["onsen", "view"],
      }),
    ).toBe(`q=${encodeURIComponent("わさび")}&cat=onsen,view`);
  });

  test("空の条件はキーごと消し、ほかのキーは残す", () => {
    expect(
      toFilterQuery(
        new URLSearchParams("utm_source=x&q=a&cat=onsen"),
        EMPTY_FILTER,
      ),
    ).toBe("utm_source=x");
  });

  test("読み直すと同じ条件になる（キーワードの , や & も）", () => {
    const filter = { q: "a,b & c", categories: ["nature" as const] };
    const query = toFilterQuery(new URLSearchParams(), filter);
    expect(fromFilterQuery(new URLSearchParams(query))).toEqual(filter);
  });
});

test("hasFilterQuery は空の値でもキーがあれば true", () => {
  expect(hasFilterQuery(new URLSearchParams("q="))).toBe(true);
  expect(hasFilterQuery(new URLSearchParams("utm_source=x"))).toBe(false);
});

test("isSameFilter はキーワードとカテゴリを比べる", () => {
  expect(isSameFilter(EMPTY_FILTER, { q: "", categories: [] })).toBe(true);
  expect(isSameFilter(EMPTY_FILTER, { q: "", categories: ["view"] })).toBe(
    false,
  );
});
