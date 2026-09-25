import { describe, expect, it } from "vitest";
import { toAreaBoundary } from "./boundary";

const ring = [
  [137.8, 36.6],
  [137.9, 36.6],
  [137.9, 36.7],
  [137.8, 36.6],
];

describe("toAreaBoundary", () => {
  it("Polygon はそのままのオブジェクトを返す", () => {
    const polygon = { type: "Polygon", coordinates: [ring] };
    expect(toAreaBoundary(polygon)).toBe(polygon);
  });

  it("MultiPolygon（飛び地）も読める", () => {
    const multi = { type: "MultiPolygon", coordinates: [[ring], [ring]] };
    expect(toAreaBoundary(multi)).toBe(multi);
  });

  it("空・GeoJSON でない値は null", () => {
    expect(toAreaBoundary(null)).toBeNull();
    expect(toAreaBoundary(undefined)).toBeNull();
    expect(toAreaBoundary("Polygon")).toBeNull();
    expect(toAreaBoundary([ring])).toBeNull();
    expect(toAreaBoundary({})).toBeNull();
  });

  it("Polygon / MultiPolygon 以外の型は null", () => {
    expect(
      toAreaBoundary({
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [ring] },
      }),
    ).toBeNull();
    expect(
      toAreaBoundary({ type: "LineString", coordinates: ring }),
    ).toBeNull();
  });

  it("座標が壊れていれば null", () => {
    expect(toAreaBoundary({ type: "Polygon", coordinates: [] })).toBeNull();
    expect(
      toAreaBoundary({ type: "Polygon", coordinates: [ring.slice(0, 3)] }),
    ).toBeNull();
    expect(
      toAreaBoundary({
        type: "Polygon",
        coordinates: [[...ring.slice(0, 3), ["137.8", "36.6"]]],
      }),
    ).toBeNull();
    expect(
      toAreaBoundary({
        type: "Polygon",
        coordinates: [[[200, 36.6], ...ring.slice(1)]],
      }),
    ).toBeNull();
    expect(
      toAreaBoundary({ type: "MultiPolygon", coordinates: [[ring], []] }),
    ).toBeNull();
  });
});
