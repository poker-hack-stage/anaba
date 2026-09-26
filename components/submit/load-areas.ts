import { createClient } from "@/lib/supabase/client";
import type { SubmittableArea } from "./spot-submission-form";

/**
 * 「穴場を教える」のフォームで使う地域（境界を含む）を、ブラウザから読む（#134）。
 * ダイアログはどのページからも開くので、ページやレイアウトのサーバー側では読まない
 * （写真の出典や 404 まで動的なページにしないため・開かない人のぶんを読まないため）。
 * 読めなければ null（ダイアログの中で知らせる）
 */
export async function loadSubmittableAreas(): Promise<
  SubmittableArea[] | null
> {
  try {
    const { data, error } = await createClient()
      .from("areas")
      .select("id, name, prefecture, center_lat, center_lng, boundary")
      .order("display_order", { ascending: true });
    if (error) throw new Error("地域を読み込めませんでした", { cause: error });
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
}
