import type { GeoJsonObject, Polygon, Position } from "geojson";
import type { MapPoint } from "@/components/map/spot-map";
import type { Area } from "@/lib/data/areas";
import { toAreaBoundary } from "@/lib/map/boundary";

// スポットの投稿（#54）で、地図に出す地域の範囲。
// DB の submit_spot() は、境界（areas.boundary）があればその内側、なければ地域の中心から 50 km 以内だけを受け付ける。
// 同じ範囲を地図に出して、どこに置けるかを見せる。
// 全国対応（47都道府県）のあとは、範囲の外にもピンを置ける。外なら「公開待ちの候補」になる（submit_spot_anywhere()）

/** 境界がない地域で受け付ける、中心からの距離（km。submit_spot() と同じ） */
export const FALLBACK_RADIUS_KM = 50;

const EARTH_RADIUS_KM = 6371;
/** 円を近似する多角形の頂点の数 */
const CIRCLE_STEPS = 64;

export type AreaRangeSource = Pick<
  Area,
  "boundary" | "center_lat" | "center_lng"
>;

/** 地図に出す範囲。境界があればそのまま、なければ中心から 50 km の円 */
export function areaRange(area: AreaRangeSource): GeoJsonObject {
  if (area.boundary && typeof area.boundary === "object") {
    return area.boundary as unknown as GeoJsonObject;
  }
  return circlePolygon(area.center_lat, area.center_lng, FALLBACK_RADIUS_KM);
}

/** 中心（緯度・経度）から radiusKm の円を多角形にする（大円の距離で頂点を求める） */
export function circlePolygon(
  lat: number,
  lng: number,
  radiusKm: number,
): Polygon {
  const phi1 = toRadians(lat);
  const lambda1 = toRadians(lng);
  const delta = radiusKm / EARTH_RADIUS_KM;
  const ring: [number, number][] = [];
  for (let i = 0; i < CIRCLE_STEPS; i++) {
    const theta = (2 * Math.PI * i) / CIRCLE_STEPS;
    const phi2 = Math.asin(
      Math.sin(phi1) * Math.cos(delta) +
        Math.cos(phi1) * Math.sin(delta) * Math.cos(theta),
    );
    const lambda2 =
      lambda1 +
      Math.atan2(
        Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
        Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2),
      );
    ring.push([toDegrees(lambda2), toDegrees(phi2)]);
  }
  ring.push(ring[0]);
  return { type: "Polygon", coordinates: [ring] };
}

/**
 * 点が地域の範囲の中か（DB の find_area_for_point() と同じ判定）。
 * 境界があればその内側（偶奇則なので穴も扱う）、読めなければ中心から 50 km 以内
 */
export function isInAreaRange(area: AreaRangeSource, point: MapPoint): boolean {
  const boundary = toAreaBoundary(area.boundary);
  if (!boundary) {
    return (
      distanceKm(area.center_lat, area.center_lng, point.lat, point.lng) <=
      FALLBACK_RADIUS_KM
    );
  }
  const polygons =
    boundary.type === "Polygon" ? [boundary.coordinates] : boundary.coordinates;
  let inside = false;
  for (const polygon of polygons) {
    for (const ring of polygon) {
      if (crossesOddTimes(ring, point)) inside = !inside;
    }
  }
  return inside;
}

/**
 * 点が入る地域。渡した順（display_order）で最初に当たったもの。どこにも入らなければ undefined。
 * 画面で「すぐ公開 / 公開待ち」を先に知らせるためのもので、最後に決めるのは DB
 */
export function findAreaForPoint<T extends AreaRangeSource>(
  areas: readonly T[],
  point: MapPoint,
): T | undefined {
  return areas.find((area) => isInAreaRange(area, point));
}

/** 点から東へ伸ばした線が、輪郭と奇数回交わるか */
function crossesOddTimes(ring: Position[], { lat, lng }: MapPoint): boolean {
  let odd = false;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    if (y1 > lat !== y2 > lat) {
      if (lng < ((x2 - x1) * (lat - y1)) / (y2 - y1) + x1) odd = !odd;
    }
  }
  return odd;
}

/** 大円の距離（km） */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const a =
    Math.sin(toRadians(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(toRadians(lng2 - lng1) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number) {
  return (rad * 180) / Math.PI;
}
