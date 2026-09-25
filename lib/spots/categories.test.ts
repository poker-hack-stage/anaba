import { describe, expect, test } from "vitest";

import { CATEGORIES, getCategory } from "./categories";

describe("getCategory", () => {
  test("定義済みのキーならそのカテゴリを返す", () => {
    expect(getCategory("onsen")).toBe(CATEGORIES.onsen);
    expect(getCategory("onsen").label).toBe("温泉・銭湯");
  });

  test("未知のキーなら自然・散策にフォールバックする", () => {
    expect(getCategory("unknown")).toBe(CATEGORIES.nature);
    expect(getCategory("")).toBe(CATEGORIES.nature);
  });
});
