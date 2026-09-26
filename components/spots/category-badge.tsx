import { getCategory } from "@/lib/spots/categories";
import { cn } from "@/lib/utils";

/**
 * スポットのカテゴリのバッジ（アイコンと名前）。「穴場を探す」のカード（spot-card.tsx）と
 * AI旅プランの経路のカード（components/planner/candidate-card.tsx）で見た目をそろえる
 */
export function CategoryBadge({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const meta = getCategory(category);
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
        meta.badge,
        className,
      )}
    >
      <meta.icon aria-hidden className="h-3 w-3 shrink-0" />
      {meta.label}
    </span>
  );
}
