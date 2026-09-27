import { describe, expect, test } from "vitest";
import {
  FALLBACK_RADIUS_KM,
  areaRange,
  circlePolygon,
  findAreaForPoint,
  isInAreaRange,
} from "./area-range";

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

describe("isInAreaRange・findAreaForPoint", () => {
  // 穴のある四角（外周 137.8〜138.0 × 36.2〜36.4、穴 137.88〜137.92 × 36.28〜36.32）
  const square = {
    id: "square",
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [137.8, 36.2],
          [138, 36.2],
          [138, 36.4],
          [137.8, 36.4],
          [137.8, 36.2],
        ],
        [
          [137.88, 36.28],
          [137.92, 36.28],
          [137.92, 36.32],
          [137.88, 36.32],
          [137.88, 36.28],
        ],
      ],
    },
    center_lat: 36.3,
    center_lng: 137.9,
  };
  const noBoundary = {
    id: "circle",
    boundary: null,
    center_lat: 26.21,
    center_lng: 127.68,
  };

  test("境界の内側なら true、外側と穴の中は false", () => {
    expect(isInAreaRange(square, { lat: 36.25, lng: 137.85 })).toBe(true);
    expect(isInAreaRange(square, { lat: 36.5, lng: 137.85 })).toBe(false);
    expect(isInAreaRange(square, { lat: 36.3, lng: 137.9 })).toBe(false);
  });

  test("境界がなければ、中心から 50 km 以内", () => {
    expect(isInAreaRange(noBoundary, { lat: 26.5, lng: 127.9 })).toBe(true);
    expect(isInAreaRange(noBoundary, { lat: 27.0, lng: 128.3 })).toBe(false);
  });

  test("入る地域を渡した順で探し、どこにも入らなければ undefined", () => {
    const areas = [square, noBoundary];
    expect(findAreaForPoint(areas, { lat: 36.25, lng: 137.85 })?.id).toBe(
      "square",
    );
    expect(findAreaForPoint(areas, { lat: 26.3, lng: 127.7 })?.id).toBe(
      "circle",
    );
    expect(findAreaForPoint(areas, { lat: 43, lng: 141.3 })).toBeUndefined();
  });
});
