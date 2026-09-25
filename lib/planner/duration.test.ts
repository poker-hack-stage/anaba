import { describe, expect, test } from "vitest";

import {
  calcDayMinutes,
  DAY_COUNTS,
  DEFAULT_STAY_MINUTES,
  formatMinutes,
} from "./duration";

const stays = (...minutes: (number | null)[]) =>
  minutes.map((stay_minutes) => ({ stay_minutes }));

describe("calcDayMinutes", () => {
  test("滞在の合計に、移動の目安 ×（スポット数 − 1）を足す", () => {
    expect(calcDayMinutes(stays(30, 60, 90), "車")).toBe(30 + 60 + 90 + 20 * 2);
  });

  test("移動の目安は移動手段ごとに変わる", () => {
    expect(calcDayMinutes(stays(30, 30), "電車・バス")).toBe(30 + 30 + 40);
    expect(calcDayMinutes(stays(30, 30), "自転車")).toBe(30 + 30 + 30);
  });

  test("滞在の目安がないスポットは60分として足す", () => {
    expect(DEFAULT_STAY_MINUTES).toBe(60);
    expect(calcDayMinutes(stays(null, 30), "車")).toBe(60 + 30 + 20);
  });

  test("知らない移動手段なら、いちばん長い移動の目安（40分）を使う", () => {
    expect(calcDayMinutes(stays(30, 30), "徒歩")).toBe(30 + 30 + 40);
  });

  test("スポットが1件なら移動はなく、0件なら0分", () => {
    expect(calcDayMinutes(stays(45), "車")).toBe(45);
    expect(calcDayMinutes([], "車")).toBe(0);
  });
});

describe("DAY_COUNTS", () => {
  test("日帰りは1日、1泊2日は2日、2泊3日は3日", () => {
    expect(DAY_COUNTS).toEqual({ day: 1, "1n2d": 2, "2n3d": 3 });
  });
});

describe("formatMinutes", () => {
  test("1時間未満は分で表す", () => {
    expect(formatMinutes(45)).toBe("約45分");
    expect(formatMinutes(0)).toBe("約0分");
  });

  test("1時間以上は30分単位に丸めて表す", () => {
    expect(formatMinutes(60)).toBe("約1時間");
    expect(formatMinutes(90)).toBe("約1時間半");
    expect(formatMinutes(240)).toBe("約4時間");
    expect(formatMinutes(255)).toBe("約4時間半");
    expect(formatMinutes(314)).toBe("約5時間");
  });
});
