import { Clock, Star } from "lucide-react";
import type { Spot } from "@/lib/data/spots";
import { getCategory } from "@/lib/spots/categories";
import { SpotImage } from "./spot-image";

/**
 * 情報パネルに並べるスポットカード（名前・タグ・写真・評価）。クリックで詳細を開く
 */
export function SpotCard({
  spot,
  onSelect,
}: {
  spot: Spot;
  onSelect?: (spot: Spot) => void;
}) {
  const meta = getCategory(spot.category);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(spot)}
      className="flex w-full gap-3 overflow-hidden rounded-2xl border border-stone-200 bg-white p-3 text-left transition-colors hover:border-stone-300 hover:bg-stone-50"
    >
      <SpotImage
        category={spot.category}
        className="h-24 w-24 shrink-0 rounded-xl"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.badge}`}
          >
            {meta.emoji} {meta.label}
          </span>
          {spot.rating !== null && (
            <span className="ml-auto flex items-center gap-0.5 text-xs font-bold text-amber-700">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              {spot.rating}
            </span>
          )}
        </div>
        <h3 className="truncate font-extrabold text-stone-900">{spot.name}</h3>
        {spot.catchphrase && (
          <p className="line-clamp-2 text-xs leading-relaxed text-stone-600">
            {spot.catchphrase}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
          {spot.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600"
            >
              #{tag}
            </span>
          ))}
          {spot.best_time && (
            <span className="ml-auto flex items-center gap-0.5 text-[10px] text-stone-500">
              <Clock className="h-3 w-3" />
              {spot.best_time}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function SpotCardSkeleton() {
  return (
    <div className="h-[122px] animate-pulse rounded-2xl bg-stone-200/60" />
  );
}
