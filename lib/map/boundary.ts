import type { MultiPolygon, Polygon, Position } from "geojson";

/** 地域の境界（`areas.boundary`）。GeoJSON の geometry。座標は [経度, 緯度]（docs/boundaries.md） */
export type AreaBoundary = Polygon | MultiPolygon;

/**
 * `areas.boundary`（DB の Json）が地図に渡せる Polygon / MultiPolygon かを確かめる。
 * 読めなければ null（地図ごと落とさない）。読めるときは渡したオブジェクトをそのまま返す
 * （SpotMap は参照が変わると描き直すので、コピーを作らない）
 */
export function toAreaBoundary(value: unknown): AreaBoundary | null {
  if (!value || typeof value !== "object") return null;
  const { type, coordinates } = value as Record<string, unknown>;
  if (type === "Polygon" && isPolygon(coordinates)) {
    return value as Polygon;
  }
  if (
    type === "MultiPolygon" &&
    Array.isArray(coordinates) &&
    coordinates.length > 0 &&
    coordinates.every(isPolygon)
  ) {
    return value as MultiPolygon;
  }
  return null;
}

/** 輪郭（最初が外周、残りが穴）の並び。輪郭は閉じた4点以上 */
function isPolygon(value: unknown): value is Position[][] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (ring) =>
        Array.isArray(ring) && ring.length >= 4 && ring.every(isPosition),
    )
  );
}

function isPosition(value: unknown): value is Position {
  if (!Array.isArray(value) || value.length < 2) return false;
  const [lng, lat] = value;
  return (
    typeof lng === "number" &&
    typeof lat === "number" &&
    Math.abs(lng) <= 180 &&
    Math.abs(lat) <= 90
  );
}
