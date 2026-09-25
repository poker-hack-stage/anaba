import { describe, expect, test } from "vitest";

import { toPlanRequest } from "./conditions";
import type { PlanConditions } from "./types";

const areas = [
  { id: "area-matsumoto", name: "松本市" },
  { id: "area-azumino", name: "安曇野市" },
];

function conditions(overrides: Partial<PlanConditions> = {}): PlanConditions {
  return {
    area: "おまかせ",
    duration: "日帰り",
    interests: ["温泉"],
    companion: "ひとり",
    transport: "車",
    ...overrides,
  };
}

describe("toPlanRequest", () => {
  test("地域名を地域の id に変える", () => {
    expect(toPlanRequest(conditions({ area: "安曇野市" }), areas).areaId).toBe(
      "area-azumino",
    );
  });

  test("「おまかせ」と知らない地域名は null（おまかせ）にする", () => {
    expect(toPlanRequest(conditions(), areas).areaId).toBeNull();
    expect(
      toPlanRequest(conditions({ area: "存在しない市" }), areas).areaId,
    ).toBeNull();
  });

  test("日程の文言をコードに変え、知らない文言は日帰りにする", () => {
    const duration = (label: string) =>
      toPlanRequest(conditions({ duration: label }), areas).duration;
    expect(duration("日帰り")).toBe("day");
    expect(duration("1泊2日")).toBe("1n2d");
    expect(duration("2泊3日")).toBe("2n3d");
    expect(duration("3泊4日")).toBe("day");
  });

  test("興味・だれと・移動手段はそのまま渡す", () => {
    expect(toPlanRequest(conditions(), areas)).toMatchObject({
      interests: ["温泉"],
      companion: "ひとり",
      transport: "車",
    });
  });
});
