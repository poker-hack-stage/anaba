import {
  Bath,
  Coffee,
  Hammer,
  Landmark,
  Sunrise,
  Trees,
  type LucideIcon,
} from "lucide-react";

// スポットのカテゴリ。キーは DB の spots.category の check 制約と合わせること。
// 見た目のアイコンは絵文字を使わず lucide-react のアイコンにする
export const CATEGORIES = {
  gourmet: {
    label: "食・カフェ",
    icon: Coffee as LucideIcon,
    badge: "bg-orange-50 text-orange-800 border-orange-200",
    color: "#ea580c",
  },
  nature: {
    label: "自然・散策",
    icon: Trees as LucideIcon,
    badge: "bg-lime-50 text-lime-800 border-lime-200",
    color: "#65a30d",
  },
  view: {
    label: "絶景",
    icon: Sunrise as LucideIcon,
    badge: "bg-sky-50 text-sky-800 border-sky-200",
    color: "#0284c7",
  },
  onsen: {
    label: "温泉・銭湯",
    icon: Bath as LucideIcon,
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    color: "#e11d48",
  },
  craft: {
    label: "手仕事・体験",
    icon: Hammer as LucideIcon,
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    color: "#4f46e5",
  },
  history: {
    label: "歴史・町並み",
    icon: Landmark as LucideIcon,
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    color: "#b45309",
  },
} as const;

export type SpotCategory = keyof typeof CATEGORIES;

export function getCategory(key: string) {
  return CATEGORIES[key as SpotCategory] ?? CATEGORIES.nature;
}
