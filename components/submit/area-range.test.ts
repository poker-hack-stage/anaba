import { describe, expect, test } from "vitest";
import { FALLBACK_RADIUS_KM, areaRange, circlePolygon } from "./area-range";

/** 2点の大円の距離（km）。DB の submit_spot() と同じ式 */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  return (
    6371 *
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin(rad(lat2 - lat1) / 2) ** 2 +
          Math.cos(rad(lat1)) *
            Math.cos(rad(lat2)) *
            Math.sin(rad(lng2 - lng1) / 2) ** 2,
      ),
    )
  );
}

describe("areaRange", () => {
  test("境界があれば、そのまま返す（地図が描き直さないよう同じ参照）", () => {
    const boundary = {
      type: "Polygon",
      coordinates: [
        [
          [137.8, 36.2],
          [138, 36.2],
          [138, 36.4],
          [137.8, 36.2],
        ],
      ],
    };
    expect(areaRange({ boundary, center_lat: 36.3, center_lng: 137.9 })).toBe(
      boundary,
    );
  });

  test("境界がなければ、中心から 50 km の円を返す", () => {
    const range = areaRange({
      boundary: null,
      center_lat: 36.3,
      center_lng: 137.9,
    });
    expect(range.type).toBe("Polygon");
  });
});

describe("circlePolygon", () => {
  test("頂点はどれも中心から半径の距離にあり、輪は閉じている", () => {
    const { coordinates } = circlePolygon(36.3, 137.9, FALLBACK_RADIUS_KM);
    const ring = coordinates[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    for (const [lng, lat] of ring) {
      expect(distanceKm(36.3, 137.9, lat, lng)).toBeCloseTo(50, 6);
    }
  });
});
