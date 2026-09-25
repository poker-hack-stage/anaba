import { describe, expect, it } from "vitest";
import type { MultiPolygon, Polygon, Position } from "geojson";
import { outsideOf, toAreaBoundary } from "./boundary";

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

describe("outsideOf", () => {
  // ring は反時計回り
  const clockwise = [...ring].reverse();

  it("世界全体の外周に、地域の外周を時計回りの穴としてくり抜く", () => {
    const polygon: Polygon = { type: "Polygon", coordinates: [ring] };
    const [outer, ...holes] = outsideOf(polygon).coordinates;

    expect(outer).toContainEqual([180, 85]);
    expect(holes).toEqual([clockwise]);
  });

  it("もともと時計回りの外周はそのまま使う", () => {
    const polygon: Polygon = { type: "Polygon", coordinates: [clockwise] };
    expect(outsideOf(polygon).coordinates.slice(1)).toEqual([clockwise]);
  });

  it("MultiPolygon は各ポリゴンの外周をくり抜き、中の穴は使わない", () => {
    const inner: Position[] = [
      [137.85, 36.62],
      [137.86, 36.62],
      [137.86, 36.63],
      [137.85, 36.62],
    ];
    const multi: MultiPolygon = {
      type: "MultiPolygon",
      coordinates: [[ring, inner], [clockwise]],
    };
    expect(outsideOf(multi).coordinates.slice(1)).toEqual([
      clockwise,
      clockwise,
    ]);
  });

  it("元の境界の配列は書き換えない", () => {
    const original = ring.map((p) => [...p]);
    outsideOf({ type: "Polygon", coordinates: [ring] });
    expect(ring).toEqual(original);
  });
});
