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

/** 世界全体を覆う外周（反時計回り）。メルカトル図法で描ける緯度の範囲にとどめる */
const WORLD_RING: Position[] = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];

/**
 * 地域の外側（世界全体から地域をくり抜いた形）。地図で地域の外を暗くするのに使う。
 * くり抜くのは各ポリゴンの外周だけにする（地域の中の穴も明るいままになるが、今の12地域に穴はない）。
 * MapLibre は輪郭の回る向きで外周と穴を見分けるので、穴は外周と逆の時計回りにそろえる
 */
export function outsideOf(boundary: AreaBoundary): Polygon {
  const outers =
    boundary.type === "Polygon"
      ? [boundary.coordinates[0]]
      : boundary.coordinates.map((polygon) => polygon[0]);
  const holes = outers.map((ring) =>
    signedArea(ring) > 0 ? [...ring].reverse() : ring,
  );
  return { type: "Polygon", coordinates: [WORLD_RING, ...holes] };
}

/** 輪郭の符号付き面積（経度・緯度のまま）。正なら反時計回り */
function signedArea(ring: Position[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
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
