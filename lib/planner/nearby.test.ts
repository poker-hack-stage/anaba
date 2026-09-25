import { describe, expect, test } from "vitest";

import { distanceKm, findNearbyAreas, NEARBY_MAX_KM } from "./nearby";

function area(id: string, center_lat: number, center_lng: number) {
  return { id, center_lat, center_lng };
}

// 北アルプス山麓の市町村のおおよその中心と、遠い地域
const matsumoto = area("松本市", 36.238, 137.972);
const azumino = area("安曇野市", 36.304, 137.906);
const omachi = area("大町市", 36.503, 137.851);
const hakuba = area("白馬村", 36.698, 137.862);
const tokyo = area("東京都", 35.69, 139.69);

const ids = (areas: { id: string }[]) => areas.map((a) => a.id);

describe("distanceKm", () => {
  test("中心どうしの距離を km で返す", () => {
    // 松本市と安曇野市はおよそ 9km
    expect(distanceKm(matsumoto, azumino)).toBeGreaterThan(8);
    expect(distanceKm(matsumoto, azumino)).toBeLessThan(11);
  });

  test("向きを入れ替えても同じ距離", () => {
    expect(distanceKm(matsumoto, hakuba)).toBeCloseTo(
      distanceKm(hakuba, matsumoto),
    );
  });

  test("同じ地域なら0", () => {
    expect(distanceKm(matsumoto, matsumoto)).toBe(0);
  });
});

describe("findNearbyAreas", () => {
  const areas = [hakuba, omachi, azumino, matsumoto, tokyo];

  test("80km 以内の地域を近い順に返し、自分自身は含めない", () => {
    expect(NEARBY_MAX_KM).toBe(80);
    expect(ids(findNearbyAreas(matsumoto, areas))).toEqual([
      "安曇野市",
      "大町市",
      "白馬村",
    ]);
  });

  test("80km より遠い地域は含めない", () => {
    // 松本市から東京都まではおよそ 170km
    expect(ids(findNearbyAreas(matsumoto, areas))).not.toContain("東京都");
    expect(findNearbyAreas(tokyo, areas)).toEqual([]);
  });

  test("距離の上限を変えられる", () => {
    expect(ids(findNearbyAreas(matsumoto, areas, 20))).toEqual(["安曇野市"]);
  });
});
