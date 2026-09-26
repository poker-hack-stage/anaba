import type { GeoJsonObject, Polygon } from "geojson";
import type { Area } from "@/lib/data/areas";

// スポットの投稿（#54）で、地図に出す地域の範囲。
// DB の submit_spot() は、境界（areas.boundary）があればその内側、なければ地域の中心から 50 km 以内だけを受け付ける。
// 同じ範囲を地図に出して、どこに置けるかを見せる

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

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number) {
  return (rad * 180) / Math.PI;
}
