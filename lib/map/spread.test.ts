import { describe, expect, it } from "vitest";
import { spreadApart, type PixelPoint } from "./spread";

function moved(points: PixelPoint[], offsets: PixelPoint[]): PixelPoint[] {
  return points.map((p, i) => ({
    x: p.x + offsets[i].x,
    y: p.y + offsets[i].y,
  }));
}

function minDistanceOf(points: PixelPoint[]): number {
  let min = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      min = Math.min(
        min,
        Math.hypot(points[j].x - points[i].x, points[j].y - points[i].y),
      );
    }
  }
  return min;
}

describe("spreadApart", () => {
  it("離れている点はずらさない", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 0, y: 50 },
    ];
    expect(spreadApart(points, 44)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
  });

  it("点が1つ以下なら何もしない", () => {
    expect(spreadApart([], 44)).toEqual([]);
    expect(spreadApart([{ x: 10, y: 10 }], 44)).toEqual([{ x: 0, y: 0 }]);
  });

  it("近い2点は結んだ線の向きに半分ずつ離す", () => {
    const points = [
      { x: 100, y: 100 },
      { x: 110, y: 100 },
    ];
    const offsets = spreadApart(points, 44);
    expect(offsets[0].x).toBeCloseTo(-17, 1);
    expect(offsets[1].x).toBeCloseTo(17, 1);
    expect(offsets[0].y).toBeCloseTo(0);
    expect(offsets[1].y).toBeCloseTo(0);
    expect(minDistanceOf(moved(points, offsets))).toBeGreaterThanOrEqual(44);
  });

  it("同じ場所の3点も、どれも minDistance 以上離す", () => {
    const points = [
      { x: 100, y: 100 },
      { x: 100, y: 100 },
      { x: 100, y: 100 },
    ];
    const offsets = spreadApart(points, 44);
    expect(minDistanceOf(moved(points, offsets))).toBeGreaterThanOrEqual(44);
    // 何度呼んでも同じ向きにずれる
    expect(spreadApart(points, 44)).toEqual(offsets);
  });

  it("2点が近く1点が少し離れているとき（大野市の配置）も、ずれはピン1つ分より小さい", () => {
    const points = [
      { x: 144, y: 76 },
      { x: 101, y: 94 },
      { x: 102, y: 93 },
    ];
    const offsets = spreadApart(points, 44);
    const after = moved(points, offsets);
    expect(minDistanceOf(after)).toBeGreaterThanOrEqual(44);
    // 近い2点のずれは、ピン1つ分（44px）ほどに収まる
    for (const o of offsets) {
      expect(Math.hypot(o.x, o.y)).toBeLessThan(44);
    }
  });

  it("まとまった点の群れでも、どれも minDistance 以上離す", () => {
    const points = Array.from({ length: 6 }, (_, i) => ({
      x: 200 + (i % 3) * 5,
      y: 150 + Math.floor(i / 3) * 5,
    }));
    const offsets = spreadApart(points, 44);
    expect(minDistanceOf(moved(points, offsets))).toBeGreaterThanOrEqual(44);
  });
});
