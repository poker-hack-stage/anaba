import { describe, expect, test } from "vitest";
import { PREFECTURES, PREFECTURE_NAMES, isPrefectureName } from "./prefectures";

describe("47都道府県", () => {
  test("47件で、コードは 01〜47 の順、名前は重ならない", () => {
    expect(PREFECTURES).toHaveLength(47);
    expect(PREFECTURES.map((p) => p.code)).toEqual(
      Array.from({ length: 47 }, (_, i) => String(i + 1).padStart(2, "0")),
    );
    expect(new Set(PREFECTURE_NAMES).size).toBe(47);
    expect(PREFECTURE_NAMES[0]).toBe("北海道");
    expect(PREFECTURE_NAMES[46]).toBe("沖縄県");
  });

  test("都道府県名かどうかを見分ける", () => {
    expect(isPrefectureName("長野県")).toBe(true);
    expect(isPrefectureName("東京都")).toBe(true);
    expect(isPrefectureName("長野")).toBe(false);
    expect(isPrefectureName("")).toBe(false);
  });
});
