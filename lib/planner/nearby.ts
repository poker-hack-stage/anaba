import type { Area } from "@/lib/data/areas";

// 近い地域の選び方（docs/spec.md のデータ-2）。地域の中心どうしの距離で決める

/** 「近い地域」とみなす距離の上限（km） */
export const NEARBY_MAX_KM = 80;

type Located = Pick<Area, "id" | "center_lat" | "center_lng">;

const EARTH_RADIUS_KM = 6371;

/** 2つの地域の中心どうしの距離（km、大円距離） */
export function distanceKm(a: Located, b: Located): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.center_lat - a.center_lat);
  const dLng = rad(b.center_lng - a.center_lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.center_lat)) *
      Math.cos(rad(b.center_lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * base から maxKm 以内の地域を、近い順に返す（base 自身は含めない）。
 * 距離が同じなら、渡された順（display_order の順）を保つ
 */
export function findNearbyAreas<T extends Located>(
  base: Located,
  areas: readonly T[],
  maxKm = NEARBY_MAX_KM,
): T[] {
  return areas
    .filter((area) => area.id !== base.id)
    .map((area) => ({ area, km: distanceKm(base, area) }))
    .filter(({ km }) => km <= maxKm)
    .sort((a, b) => a.km - b.km)
    .map(({ area }) => area);
}
