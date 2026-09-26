import {
  Baby,
  Bike,
  Car,
  Heart,
  Moon,
  MoonStar,
  Shuffle,
  Sun,
  TrainFront,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { INTEREST_TO_CATEGORY } from "@/lib/planner/generate";
import { COMPANIONS, INTERESTS, TRANSPORTS } from "@/lib/planner/options";
import type { PlanDuration } from "@/lib/planner/types";
import { getCategory } from "@/lib/spots/categories";

// AI 旅プランの旅の条件のチップに添えるアイコン（#148）。見て選びやすくするための飾りで、読み上げは文字のまま（aria-hidden）。
// 選択肢を足したときにアイコンの付け忘れが型エラーになるよう、選択肢の型をキーにする

/** エリアの「おまかせ」 */
export const ANY_AREA_ICON: LucideIcon = Shuffle;

export const DURATION_ICONS: Record<PlanDuration, LucideIcon> = {
  day: Sun,
  "1n2d": Moon,
  "2n3d": MoonStar,
};

/** 興味のあること。「穴場を探す」のカテゴリのチップ（lib/spots/categories.ts）と同じアイコンにする */
export const INTEREST_ICONS = Object.fromEntries(
  INTERESTS.map((interest) => [
    interest,
    getCategory(INTEREST_TO_CATEGORY[interest]).icon,
  ]),
) as Record<(typeof INTERESTS)[number], LucideIcon>;

export const COMPANION_ICONS: Record<(typeof COMPANIONS)[number], LucideIcon> =
  {
    ひとり: User,
    友人: Users,
    カップル: Heart,
    "家族（子連れ）": Baby,
  };

export const TRANSPORT_ICONS: Record<(typeof TRANSPORTS)[number], LucideIcon> =
  {
    車: Car,
    "電車・バス": TrainFront,
    自転車: Bike,
  };
