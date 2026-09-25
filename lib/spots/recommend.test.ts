import { describe, expect, test } from "vitest";

import { pickRecommended, type RecommendableSpot } from "./recommend";

function spot(
  name: string,
  category: string,
  rating: number | null,
): RecommendableSpot {
  return { name, category, rating };
}

const names = (spots: RecommendableSpot[]) => spots.map((s) => s.name);

describe("pickRecommended", () => {
  test("スポットが3件より多ければ3件を返す", () => {
    const spots = [
      spot("A", "gourmet", 4.0),
      spot("B", "nature", 3.5),
      spot("C", "view", 4.5),
      spot("D", "onsen", 3.0),
      spot("E", "craft", 2.5),
    ];

    expect(pickRecommended(spots)).toHaveLength(3);
  });

  test("評価の高い順に並ぶ", () => {
    const spots = [
      spot("A", "gourmet", 3.0),
      spot("B", "nature", 4.8),
      spot("C", "view", 4.1),
      spot("D", "onsen", 2.0),
    ];

    expect(names(pickRecommended(spots))).toEqual(["B", "C", "A"]);
  });

  test("評価がないスポットは評価のあるスポットより後ろになる", () => {
    const spots = [
      spot("A", "gourmet", null),
      spot("B", "nature", 0),
      spot("C", "view", null),
      spot("D", "onsen", 1.5),
    ];

    expect(names(pickRecommended(spots))).toEqual(["D", "B", "A"]);
  });

  test("評価が同じなら名前の順になる", () => {
    const spots = [
      spot("わさび田", "nature", 4.0),
      spot("あづみ野カフェ", "gourmet", 4.0),
      spot("かやぶきの宿", "history", 4.0),
    ];

    expect(names(pickRecommended(spots))).toEqual([
      "あづみ野カフェ",
      "かやぶきの宿",
      "わさび田",
    ]);
  });

  test("カテゴリがかぶらないように選ぶ", () => {
    const spots = [
      spot("温泉1", "onsen", 4.9),
      spot("温泉2", "onsen", 4.8),
      spot("温泉3", "onsen", 4.7),
      spot("絶景", "view", 3.0),
      spot("カフェ", "gourmet", 2.0),
    ];

    const picked = pickRecommended(spots);

    expect(names(picked)).toEqual(["温泉1", "絶景", "カフェ"]);
    expect(new Set(picked.map((s) => s.category)).size).toBe(3);
  });

  test("カテゴリが3種類に満たなければ、残りを評価の高い順で埋める", () => {
    const spots = [
      spot("温泉1", "onsen", 4.9),
      spot("温泉2", "onsen", 4.8),
      spot("温泉3", "onsen", 4.7),
      spot("絶景", "view", 3.0),
    ];

    expect(names(pickRecommended(spots))).toEqual(["温泉1", "絶景", "温泉2"]);
  });

  test("スポットが3件未満の地域でも落ちず、ある分だけ返す", () => {
    expect(names(pickRecommended([spot("A", "onsen", 4.0)]))).toEqual(["A"]);
    expect(
      names(
        pickRecommended([spot("A", "onsen", null), spot("B", "onsen", 3.0)]),
      ),
    ).toEqual(["B", "A"]);
    expect(pickRecommended([])).toEqual([]);
  });

  test("件数を指定できる", () => {
    const spots = [
      spot("A", "gourmet", 4.0),
      spot("B", "nature", 3.5),
      spot("C", "view", 4.5),
    ];

    expect(names(pickRecommended(spots, 2))).toEqual(["C", "A"]);
    expect(pickRecommended(spots, 0)).toEqual([]);
  });

  test("渡した配列を書き換えない", () => {
    const spots = [
      spot("A", "gourmet", 1.0),
      spot("B", "nature", 5.0),
      spot("C", "view", 3.0),
    ];
    const before = [...spots];

    pickRecommended(spots);

    expect(spots).toEqual(before);
  });
});
