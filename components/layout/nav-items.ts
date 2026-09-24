import { Route, Search, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** 選択中のタブの色 */
  activeClass: string;
};

// タブを増やすときはここに追加する（ヘッダーと下部ナビの両方に反映される）
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "穴場を探す",
    icon: Search,
    activeClass: "bg-ink-light text-ink border-ink/20",
  },
  {
    href: "/planner",
    label: "AI旅プラン",
    icon: Route,
    activeClass: "bg-shu-light text-shu border-shu-border",
  },
];

export function isActive(href: string, pathname: string | null) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
