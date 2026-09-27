import { describe, expect, test } from "vitest";
import raw from "./municipalities.json";
import {
  findMunicipality,
  loadMunicipalities,
  prefectureBounds,
  toMunicipalityIndex,
  type RawMunicipalities,
} from "./municipalities";
import { PREFECTURE_NAMES } from "./prefectures";

const index = toMunicipalityIndex(raw as unknown as RawMunicipalities);

describe("市区町村の候補", () => {
  test("47都道府県すべてにあり、名前は県の中で重ならない", () => {
    expect(Object.keys(index)).toEqual(PREFECTURE_NAMES);
    for (const list of Object.values(index)) {
      expect(list.length).toBeGreaterThan(0);
      expect(new Set(list.map((m) => m.name)).size).toBe(list.length);
    }
  });

  test("範囲は日本の中で、西 < 東・南 < 北", () => {
    for (const list of Object.values(index)) {
      for (const {
        bounds: [[west, south], [east, north]],
      } of list) {
        expect(west).toBeLessThan(east);
        expect(south).toBeLessThan(north);
        expect(west).toBeGreaterThanOrEqual(122);
        expect(east).toBeLessThanOrEqual(154);
        expect(south).toBeGreaterThanOrEqual(20);
        expect(north).toBeLessThanOrEqual(46);
      }
    }
  });

  test("政令指定都市の区は市にまとめ、郡の名前は外す", () => {
    expect(findMunicipality(index, "北海道", "札幌市")).toBeDefined();
    expect(findMunicipality(index, "北海道", "札幌市中央区")).toBeUndefined();
    expect(findMunicipality(index, "長野県", "白馬村")).toBeDefined();
    expect(findMunicipality(index, "長野県", "北安曇郡白馬村")).toBeUndefined();
    expect(findMunicipality(index, "東京都", "千代田区")).toBeDefined();
  });

  test("県の中だけで探し、前後の空白は無視する", () => {
    expect(findMunicipality(index, "長野県", " 松本市 ")?.name).toBe("松本市");
    expect(findMunicipality(index, "沖縄県", "松本市")).toBeUndefined();
    expect(findMunicipality(index, "長野県", "")).toBeUndefined();
    expect(findMunicipality(index, "", "松本市")).toBeUndefined();
  });

  test("県の範囲は、県の市区町村をすべて含む", () => {
    const box = prefectureBounds(index, "長野県");
    const matsumoto = findMunicipality(index, "長野県", "松本市");
    expect(box).not.toBeNull();
    expect(box![0][0]).toBeLessThanOrEqual(matsumoto!.bounds[0][0]);
    expect(box![1][1]).toBeGreaterThanOrEqual(matsumoto!.bounds[1][1]);
    expect(prefectureBounds(index, "")).toBeNull();
  });

  test("loadMunicipalities() は同じデータを読む", async () => {
    const loaded = await loadMunicipalities();
    expect(loaded?.["長野県"]).toEqual(index["長野県"]);
  });
});
