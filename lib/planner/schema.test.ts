import { describe, expect, test } from "vitest";

import { aiPlanSchema, planConditionsSchema } from "./schema";

const valid = {
  areaId: "10000000-0000-4000-8000-000000000005",
  duration: "1n2d",
  interests: ["温泉", "食"],
  companion: "家族（子連れ）",
  transport: "電車・バス",
};

describe("planConditionsSchema", () => {
  test("選択肢どおりの条件を受け付ける", () => {
    expect(planConditionsSchema.parse(valid)).toEqual(valid);
    expect(
      planConditionsSchema.parse({ ...valid, areaId: null, interests: [] }),
    ).toMatchObject({ areaId: null, interests: [] });
  });

  test("興味の重なりは1つにまとめる", () => {
    expect(
      planConditionsSchema.parse({ ...valid, interests: ["温泉", "温泉"] })
        .interests,
    ).toEqual(["温泉"]);
  });

  test.each([
    ["日程が選択肢にない", { duration: "3n4d" }],
    ["日程が表示の文言", { duration: "1泊2日" }],
    ["興味が選択肢にない", { interests: ["買い物"] }],
    ["興味が多すぎる", { interests: Array(7).fill("食") }],
    ["だれとが選択肢にない", { companion: "ペット" }],
    ["移動手段が選択肢にない", { transport: "飛行機" }],
    ["地域の id が空", { areaId: " " }],
    ["地域の id が長すぎる", { areaId: "a".repeat(65) }],
    ["地域名で送っている（古い形）", { areaId: undefined, area: "松本市" }],
    ["余計な項目がある", { note: "よろしく" }],
    ["型が違う", { interests: "温泉" }],
  ])("%s なら受け付けない", (_, overrides) => {
    expect(
      planConditionsSchema.safeParse({ ...valid, ...overrides }).success,
    ).toBe(false);
  });

  test("項目が欠けていたら受け付けない", () => {
    const missing: Partial<typeof valid> = { ...valid };
    delete missing.transport;
    expect(planConditionsSchema.safeParse(missing).success).toBe(false);
  });
});

describe("aiPlanSchema", () => {
  test("候補の形が崩れていたら受け付けない", () => {
    expect(
      aiPlanSchema.safeParse({ candidates: [{ title: "a" }] }).success,
    ).toBe(false);
    expect(aiPlanSchema.safeParse({}).success).toBe(false);
  });

  test("形が合っていれば受け付ける（中身の正しさは ai-candidates で確かめる）", () => {
    expect(
      aiPlanSchema.safeParse({
        candidates: [
          {
            title: "t",
            summary: "s",
            reason: "r",
            days: [{ areaId: "A1", spotIds: ["S1", "S2"] }],
          },
        ],
      }).success,
    ).toBe(true);
  });
});
