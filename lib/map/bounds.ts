import type { GeoJsonObject, Position } from "geojson";

/** 経度・緯度の範囲。[[西, 南], [東, 北]]（MapLibre の LngLatBoundsLike と同じ並び） */
export type LngLatBox = [[number, number], [number, number]];

/**
 * 点（[経度, 緯度]）と境界（GeoJSON）が全部入る範囲を返す。
 * 何も入らなければ null。境界は DB の値なので、GeoJSON として読めない部分は無視する（地図ごと落とさない）
 */
export function computeBounds(
  points: [number, number][],
  boundary?: GeoJsonObject | null,
): LngLatBox | null {
  const positions: Position[] = [...points];
  if (boundary) collectPositions(boundary, positions);

  let box: LngLatBox | null = null;
  for (const [lng, lat] of positions) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (!box) {
      box = [
        [lng, lat],
        [lng, lat],
      ];
      continue;
    }
    box[0][0] = Math.min(box[0][0], lng);
    box[0][1] = Math.min(box[0][1], lat);
    box[1][0] = Math.max(box[1][0], lng);
    box[1][1] = Math.max(box[1][1], lat);
  }
  return box;
}

/** GeoJSON の中の座標を全部 out に集める */
function collectPositions(value: unknown, out: Position[]) {
  if (!value || typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  switch (obj.type) {
    case "FeatureCollection":
      if (Array.isArray(obj.features)) {
        for (const f of obj.features) collectPositions(f, out);
      }
      return;
    case "Feature":
      collectPositions(obj.geometry, out);
      return;
    case "GeometryCollection":
      if (Array.isArray(obj.geometries)) {
        for (const g of obj.geometries) collectPositions(g, out);
      }
      return;
    default:
      collectCoordinates(obj.coordinates, out);
  }
}

/** coordinates（入れ子の配列）から [経度, 緯度] を取り出す */
function collectCoordinates(value: unknown, out: Position[]) {
  if (!Array.isArray(value)) return;
  if (typeof value[0] === "number" && typeof value[1] === "number") {
    out.push([value[0], value[1]]);
    return;
  }
  for (const v of value) collectCoordinates(v, out);
}
