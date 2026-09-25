import { describe, expect, test } from "vitest";

import { area, areas, far, request, spot } from "@/test/fixtures/planner";
import type { PlannableArea } from "./generate";
import { buildPlanPrompt, getPlanScope } from "./ai-prompt";

const ids = (list: { id: string }[]) => list.map((a) => a.id);

/** 本当の id から、プロンプトの記号を引く */
function keyOf(map: Map<string, string>, id: string) {
  return [...map].find(([, value]) => value === id)?.[0];
}

describe("getPlanScope", () => {
  test("「おまかせ」なら、スポットが2件以上ある地域すべてが候補になる", () => {
    const tiny = area("小さな村", 36.25, 137.95, ["onsen"]);

    const scope = getPlanScope([...areas, tiny], request());

    expect(scope.selected).toBeUndefined();
    expect(ids(scope.bases)).toEqual(ids(areas));
  });

  test("地域を選ぶと、その地域と 80km 以内の地域（近い順）が候補になる", () => {
    const scope = getPlanScope(areas, request({ areaId: "松本市" }));

    expect(scope.selected?.id).toBe("松本市");
    expect(ids(scope.bases)).toEqual([
      "松本市",
      "安曇野市",
      "大町市",
      "白馬村",
    ]);
  });
});

describe("buildPlanPrompt", () => {
  test("地域とスポットを短い記号で渡し、本当の id に戻せる", () => {
    const prompt = buildPlanPrompt(areas, request({ areaId: "松本市" }));

    const areaKey = keyOf(prompt.areaIdByKey, "松本市");
    expect(areaKey).toMatch(/^A\d+$/);
    const spotKey = keyOf(prompt.spotIdByKey, "松本市/松本市のonsen3");
    expect(spotKey).toMatch(/^S\d+$/);
    expect(prompt.contents).toContain(`${spotKey} ${areaKey} 松本市のonsen3`);
  });

  test("スポットの穴場度と評価を渡し、値がない・範囲外なら書かない", () => {
    const town: PlannableArea = {
      ...area("穴場の町", 36.238, 137.972, []),
      spots: [
        spot("穴場の町", "穴場", "nature", { rating: 4, gem: 5 }),
        spot("穴場の町", "値なし", "nature", { rating: null, gem: null }),
        spot("穴場の町", "範囲外", "nature", { rating: 9, gem: 7 }),
      ],
    };

    const prompt = buildPlanPrompt([town], request({ areaId: "穴場の町" }));
    const line = (name: string) =>
      prompt.contents.split("\n").find((l) => l.includes(` ${name}｜`)) ?? "";

    expect(line("値なし")).not.toBe("");
    expect(line("範囲外")).not.toBe("");
    expect(line("穴場")).toContain("｜穴場度5｜評価4.0｜");
    expect(line("値なし")).not.toMatch(/穴場度|評価/);
    expect(line("範囲外")).not.toMatch(/穴場度|評価/);
    expect(prompt.systemInstruction).toContain(
      "穴場度の高いスポットを優先する",
    );
  });

  test("地域を選ぶと、1件目の1日目をその地域にするよう頼む", () => {
    const prompt = buildPlanPrompt(areas, request({ areaId: "松本市" }));

    const key = keyOf(prompt.areaIdByKey, "松本市");
    expect(prompt.contents).toContain(`1件目の1日目は、必ず ${key}（松本市）`);
  });

  test("作れる候補の数をはっきり伝える", () => {
    expect(buildPlanPrompt(areas, request()).contents).toContain(
      "候補はちょうど3件作る",
    );
    expect(
      buildPlanPrompt(areas, request({ areaId: "遠い町" })).contents,
    ).toContain("候補はちょうど1件作る");
  });

  test("日帰りで地域を選んだら、遠い地域のスポットは渡さない", () => {
    const prompt = buildPlanPrompt(areas, request({ areaId: "松本市" }));

    expect(keyOf(prompt.areaIdByKey, far.id)).toBeUndefined();
    expect(prompt.contents).not.toContain(far.spots[0].name);
  });

  test("旅の条件を伝える", () => {
    const prompt = buildPlanPrompt(
      areas,
      request({
        duration: "2n3d",
        interests: ["温泉", "歴史"],
        companion: "家族（子連れ）",
        transport: "自転車",
      }),
    );

    expect(prompt.contents).toContain("- 日程: 2泊3日（3日）");
    expect(prompt.contents).toContain("- 興味のあること: 温泉、歴史");
    expect(prompt.contents).toContain("- だれと: 家族（子連れ）");
    expect(prompt.contents).toContain("- 移動手段: 自転車");
    expect(prompt.contents).toContain("days はちょうど3日分");
  });
});
