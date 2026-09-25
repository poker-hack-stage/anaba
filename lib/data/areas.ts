import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { pickRecommended } from "@/lib/spots/recommend";
import type { Spot } from "./spots";

export type Area = Tables<"areas">;

export type AreaWithSpots = Area & {
  /** 地域内のすべてのスポット（地図に出す） */
  spots: Spot[];
  /** おすすめ3件（地図でハイライトし、情報パネルに出す） */
  recommended: Spot[];
};

export async function getAreas(): Promise<Area[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) throw new Error("地域を読み込めませんでした", { cause: error });
  return data;
}

/** 地域ごとにスポットとおすすめ3件をまとめて返す */
export async function getAreasWithSpots(): Promise<AreaWithSpots[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("*, spots (*)")
    .order("display_order", { ascending: true });

  // Supabase のエラーはただのオブジェクトなので、Error に包んで投げる（ログにメッセージとスタックが出るように。
  // 画面の表示は app/error.tsx）
  if (error) {
    throw new Error("地域とスポットを読み込めませんでした", { cause: error });
  }
  return data.map((area) => ({
    ...area,
    recommended: pickRecommended(area.spots),
  }));
}
