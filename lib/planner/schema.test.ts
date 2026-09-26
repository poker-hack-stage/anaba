import { describe, expect, test } from "vitest";

import {
  AI_PLAN_JSON_SCHEMA,
  aiPlanSchema,
  planConditionsSchema,
} from "./schema";

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

  test("必ず入れるスポットの id（#32）は任意で受け付ける", () => {
    expect(
      planConditionsSchema.parse({ ...valid, includeSpotId: "spot-1" }),
    ).toEqual({ ...valid, includeSpotId: "spot-1" });
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
    ["必ず入れるスポットの id が空", { includeSpotId: " " }],
    ["必ず入れるスポットの id が長すぎる", { includeSpotId: "a".repeat(65) }],
    ["必ず入れるスポットの id が文字列でない", { includeSpotId: 1 }],
    ["地域名で送っている（古い形）", { areaId: undefined, area: "松本市" }],
    ["余計な項目がある", { pace: "ゆったり" }],
    ["希望が101字", { note: "あ".repeat(101) }],
    ["希望が文字列でない", { note: 1 }],
    ["型が違う", { interests: "温泉" }],
  ])("%s なら受け付けない", (_, overrides) => {
    expect(
      planConditionsSchema.safeParse({ ...valid, ...overrides }).success,
    ).toBe(false);
  });

  test("希望（#114）は任意で、100字まで受け付ける", () => {
    expect(planConditionsSchema.parse(valid).note).toBeUndefined();
    expect(
      planConditionsSchema.parse({ ...valid, note: "あ".repeat(100) }).note,
    ).toBe("あ".repeat(100));
    // 絵文字（サロゲートペア）も1文字と数える
    expect(
      planConditionsSchema.safeParse({ ...valid, note: "🌧".repeat(100) })
        .success,
    ).toBe(true);
  });

  test("希望が空・空白だけなら、書かなかったことにする", () => {
    expect(planConditionsSchema.parse({ ...valid, note: "" }).note).toBe(
      undefined,
    );
    expect(planConditionsSchema.parse({ ...valid, note: " \n " }).note).toBe(
      undefined,
    );
  });

  test("希望の改行・制御文字は空白にし、前後の空白を取ってから長さを数える", () => {
    expect(
      planConditionsSchema.parse({
        ...valid,
        note: "  雨でも\r\n楽しめる\u0000所\u2028がいい  ",
      }).note,
    ).toBe("雨でも 楽しめる 所 がいい");
    // 前後の空白は数えない
    expect(
      planConditionsSchema.safeParse({
        ...valid,
        note: ` ${"あ".repeat(100)}\n`,
      }).success,
    ).toBe(true);
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

describe("AI_PLAN_JSON_SCHEMA", () => {
  test("候補・日・スポットの件数の範囲を伝える（#113）", () => {
    const candidates = AI_PLAN_JSON_SCHEMA.properties.candidates;
    const days = candidates.items.properties.days;
    const spotIds = days.items.properties.spotIds;

    expect(candidates).toMatchObject({ minItems: 1, maxItems: 3 });
    expect(days).toMatchObject({ minItems: 1, maxItems: 3 });
    expect(spotIds).toMatchObject({ minItems: 2, maxItems: 4 });
  });
});
