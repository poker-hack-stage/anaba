import type { Spot } from "@/lib/data/spots";
import type { PlannableArea } from "@/lib/planner/generate";
import type { PlanConditions } from "@/lib/planner/types";

// AI旅プランのテストで使う地域・スポット・条件（Supabase は読まない）

export function spot(
  areaId: string,
  name: string,
  category: string,
  {
    rating = 4.0,
    stay = 60,
    lat = 0,
    lng = 0,
  }: {
    rating?: number | null;
    stay?: number | null;
    lat?: number;
    lng?: number;
  } = {},
): Spot {
  return {
    id: `${areaId}/${name}`,
    area_id: areaId,
    name,
    category,
    lat,
    lng,
    rating,
    hidden_gem_score: null,
    stay_minutes: stay,
    catchphrase: null,
    description: null,
    local_tip: null,
    best_time: null,
    image_path: null,
    tags: [],
    source: "seed",
    status: "published",
    nickname: null,
    created_at: "2026-09-25T00:00:00Z",
    updated_at: "2026-09-25T00:00:00Z",
  };
}

/** 地域の中心のまわりに、カテゴリごとに1件ずつスポットを置く。id と名前は同じにする */
export function area(
  id: string,
  center_lat: number,
  center_lng: number,
  categories: string[],
): PlannableArea {
  return {
    id,
    name: id,
    catchphrase: `${id}のキャッチコピー`,
    center_lat,
    center_lng,
    spots: categories.map((category, i) =>
      spot(id, `${id}の${category}${i}`, category, {
        lat: center_lat + i * 0.01,
        lng: center_lng,
      }),
    ),
  };
}

export const EIGHT_CATEGORIES = [
  "gourmet",
  "nature",
  "view",
  "onsen",
  "craft",
  "history",
  "nature",
  "view",
];

// 北アルプス山麓（互いに 80km 以内）と、遠い地域
export const matsumoto = area("松本市", 36.238, 137.972, EIGHT_CATEGORIES);
export const azumino = area("安曇野市", 36.304, 137.906, EIGHT_CATEGORIES);
export const omachi = area("大町市", 36.503, 137.851, EIGHT_CATEGORIES);
export const hakuba = area("白馬村", 36.698, 137.862, EIGHT_CATEGORIES);
export const far = area("遠い町", 43.06, 141.35, [
  "gourmet",
  "nature",
  "onsen",
  "view",
]);
/** display_order の順（北から） */
export const areas = [hakuba, omachi, azumino, matsumoto, far];

export function request(
  overrides: Partial<PlanConditions> = {},
): PlanConditions {
  return {
    areaId: null,
    duration: "day",
    interests: [],
    companion: "ひとり",
    transport: "車",
    ...overrides,
  };
}
