import { describe, expect, test } from "vitest";

import {
  compareByHiddenGemScore,
  compareByRating,
  formatRating,
  getHiddenGemScore,
  getRating,
} from "./score";

const rated = (name: string, rating: number | null) => ({ name, rating });
const gem = (name: string, hidden_gem_score: number | null) => ({
  name,
  hidden_gem_score,
});
const names = (spots: { name: string }[]) => spots.map((s) => s.name);

describe("getRating", () => {
  test("0〜5 の値はそのまま返す（両端を含む）", () => {
    expect(getRating({ rating: 0 })).toBe(0);
    expect(getRating({ rating: 4.5 })).toBe(4.5);
    expect(getRating({ rating: 5 })).toBe(5);
  });

  test.each([
    ["値がない", null],
    ["0 より小さい", -0.1],
    ["5 より大きい", 5.1],
    ["数でない（NaN）", Number.NaN],
    ["無限大", Number.POSITIVE_INFINITY],
  ])("%s なら null", (_, rating) => {
    expect(getRating({ rating })).toBeNull();
  });
});

describe("getHiddenGemScore", () => {
  test("1〜5 の整数はそのまま返す（両端を含む）", () => {
    expect(getHiddenGemScore({ hidden_gem_score: 1 })).toBe(1);
    expect(getHiddenGemScore({ hidden_gem_score: 3 })).toBe(3);
    expect(getHiddenGemScore({ hidden_gem_score: 5 })).toBe(5);
  });

  test.each([
    ["値がない", null],
    ["0", 0],
    ["5 より大きい", 6],
    ["マイナス", -1],
    ["整数でない", 2.5],
    ["数でない（NaN）", Number.NaN],
  ])("%s なら null", (_, hidden_gem_score) => {
    expect(getHiddenGemScore({ hidden_gem_score })).toBeNull();
  });
});

describe("formatRating", () => {
  test("小数1桁で表す", () => {
    expect(formatRating(4)).toBe("4.0");
    expect(formatRating(4.5)).toBe("4.5");
    expect(formatRating(0)).toBe("0.0");
  });
});

describe("compareByRating", () => {
  test("評価の高い順に並び、評価がない・範囲外のスポットは評価 0 より後ろ", () => {
    const spots = [
      rated("なし", null),
      rated("低い", 2),
      rated("ゼロ", 0),
      rated("範囲外", 9),
      rated("高い", 4.8),
    ];

    const sorted = [...spots].sort(compareByRating);

    expect(names(sorted.slice(0, 3))).toEqual(["高い", "低い", "ゼロ"]);
    expect(names(sorted.slice(3)).sort()).toEqual(["なし", "範囲外"].sort());
  });

  test("評価が同じなら 0（並びを変えない）", () => {
    expect(compareByRating(rated("a", 3.5), rated("b", 3.5))).toBe(0);
    expect(compareByRating(rated("a", null), rated("b", null))).toBe(0);
  });
});

describe("compareByHiddenGemScore", () => {
  test("穴場度の高い順に並び、穴場度がない・範囲外のスポットは後ろ", () => {
    const spots = [
      gem("なし", null),
      gem("有名", 1),
      gem("範囲外", 7),
      gem("穴場", 5),
      gem("ふつう", 3),
    ];

    const sorted = [...spots].sort(compareByHiddenGemScore);

    expect(names(sorted.slice(0, 3))).toEqual(["穴場", "ふつう", "有名"]);
    expect(names(sorted.slice(3)).sort()).toEqual(["なし", "範囲外"].sort());
  });

  test("穴場度が同じなら 0（次の基準で並べられるように）", () => {
    expect(compareByHiddenGemScore(gem("a", 4), gem("b", 4))).toBe(0);
    expect(compareByHiddenGemScore(gem("a", null), gem("b", null))).toBe(0);
  });
});
