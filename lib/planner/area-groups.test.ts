import { describe, expect, test } from "vitest";

import {
  findPrefectureAreas,
  groupAreasByPrefecture,
  type PrefectureGroup,
} from "./area-groups";

const area = (name: string, prefecture: string) => ({ name, prefecture });
type TestArea = ReturnType<typeof area>;
const names = (groups: PrefectureGroup<TestArea>[]) =>
  groups.map((g) => [g.prefecture, g.areas.map((a) => a.name)]);

describe("groupAreasByPrefecture", () => {
  test("都道府県は最初に出てきた順、地域は渡した順のまま", () => {
    const groups = groupAreasByPrefecture([
      area("白馬村", "長野県"),
      area("大町市", "長野県"),
      area("東川町", "北海道"),
      area("松本市", "長野県"),
      area("竹富町", "沖縄県"),
    ]);

    expect(names(groups)).toEqual([
      ["長野県", ["白馬村", "大町市", "松本市"]],
      ["北海道", ["東川町"]],
      ["沖縄県", ["竹富町"]],
    ]);
  });

  test("地域がなければ空", () => {
    expect(groupAreasByPrefecture([])).toEqual([]);
  });

  test("渡した配列を書き換えない", () => {
    const areas = [area("東川町", "北海道"), area("白馬村", "長野県")];
    const copy = [...areas];

    groupAreasByPrefecture(areas);

    expect(areas).toEqual(copy);
  });
});

describe("findPrefectureAreas", () => {
  const areas = [
    area("白馬村", "長野県"),
    area("東川町", "北海道"),
    area("松本市", "長野県"),
  ];

  test("県の地域を渡した順のまま返す", () => {
    expect(findPrefectureAreas(areas, "長野県")?.map((a) => a.name)).toEqual([
      "白馬村",
      "松本市",
    ]);
  });

  test("県を選んでいない・地域がない県なら undefined", () => {
    expect(findPrefectureAreas(areas, undefined)).toBeUndefined();
    expect(findPrefectureAreas(areas, "大阪府")).toBeUndefined();
  });
});
