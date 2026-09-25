import { describe, expect, test } from "vitest";

import { summarizeRatings } from "./reviews";

describe("summarizeRatings", () => {
  test("口コミがなければ件数0・平均 null", () => {
    expect(summarizeRatings([0, 0, 0, 0, 0])).toEqual({
      count: 0,
      average: null,
    });
  });

  test("星ごとの件数から件数と平均（小数1桁）を出す", () => {
    // ★5 が2件・★4 が1件 → 14 / 3 = 4.666…
    expect(summarizeRatings([0, 0, 0, 1, 2])).toEqual({
      count: 3,
      average: 4.7,
    });
  });

  test("ちょうど .x5 は切り上げる（浮動小数の誤差で切り捨てない）", () => {
    // 83 / 20 = 4.15
    expect(summarizeRatings([0, 0, 0, 17, 3]).average).toBe(4.2);
  });
});
