import { describe, expect, it } from "vitest";
import type { GeoJsonObject } from "geojson";
import { computeBounds } from "./bounds";

describe("computeBounds", () => {
  it("点も境界もなければ null", () => {
    expect(computeBounds([])).toBeNull();
    expect(computeBounds([], null)).toBeNull();
  });

  it("点が全部入る範囲を返す", () => {
    expect(
      computeBounds([
        [137.8, 36.3],
        [137.9, 36.5],
        [137.7, 36.4],
      ]),
    ).toEqual([
      [137.7, 36.3],
      [137.9, 36.5],
    ]);
  });

  it("境界（Feature の MultiPolygon）も範囲に含める", () => {
    const boundary = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [137.5, 36.0],
              [138.0, 36.0],
              [138.0, 36.6],
              [137.5, 36.0],
            ],
          ],
        ],
      },
    } as GeoJsonObject;
    expect(computeBounds([[137.8, 36.3]], boundary)).toEqual([
      [137.5, 36.0],
      [138.0, 36.6],
    ]);
  });

  it("FeatureCollection と GeometryCollection の中も見る", () => {
    const boundary = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "GeometryCollection",
            geometries: [
              { type: "Point", coordinates: [139, 35] },
              { type: "LineString", coordinates: [[140, 36]] },
            ],
          },
        },
      ],
    } as GeoJsonObject;
    expect(computeBounds([], boundary)).toEqual([
      [139, 35],
      [140, 36],
    ]);
  });

  it("GeoJSON として読めない境界は無視する", () => {
    const broken = {
      type: "Polygon",
      coordinates: "oops",
    } as unknown as GeoJsonObject;
    expect(computeBounds([[137.8, 36.3]], broken)).toEqual([
      [137.8, 36.3],
      [137.8, 36.3],
    ]);
    expect(
      computeBounds([], { type: "Feature" } as unknown as GeoJsonObject),
    ).toBeNull();
  });
});
