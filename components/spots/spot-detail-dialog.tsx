"use client";

import { useEffect } from "react";
import { Clock, Lightbulb, Star, Timer, X } from "lucide-react";
import type { Spot } from "@/lib/data/spots";
import { getCategory } from "@/lib/spots/categories";
import { SpotImage } from "./spot-image";

/** スポット詳細。「穴場を探す」と「AI旅プラン」の両方で使う（#24） */
export function SpotDetailDialog({
  spot,
  onClose,
}: {
  spot: Spot | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!spot) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [spot, onClose]);

  if (!spot) return null;
  const meta = getCategory(spot.category);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={spot.name}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <SpotImage
            category={spot.category}
            className="h-48 w-full text-6xl sm:h-56"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow hover:bg-white"
          >
            <X className="h-5 w-5" />
          </button>
          <span
            className={`absolute bottom-3 left-3 rounded-full border px-2.5 py-0.5 text-xs font-bold ${meta.badge}`}
          >
            {meta.emoji} {meta.label}
          </span>
        </div>

        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-extrabold text-stone-900">
                {spot.name}
              </h2>
              {spot.rating !== null && (
                <span className="flex shrink-0 items-center gap-1 font-bold text-amber-700">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  {spot.rating}
                </span>
              )}
            </div>
            {spot.catchphrase && (
              <p className="mt-1 text-sm text-stone-600">{spot.catchphrase}</p>
            )}
          </div>

          {spot.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {spot.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {spot.description && (
            <p className="text-sm leading-relaxed text-stone-700">
              {spot.description}
            </p>
          )}

          {spot.local_tip && (
            <div className="flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-emerald-700">
                  地元の人のおすすめ
                </p>
                {spot.local_tip}
              </div>
            </div>
          )}

          {(spot.best_time || spot.stay_minutes) && (
            <dl className="grid grid-cols-2 gap-2 text-xs">
              {spot.best_time && (
                <div className="rounded-xl bg-stone-50 p-3">
                  <dt className="flex items-center gap-1 text-stone-500">
                    <Clock className="h-3 w-3" />
                    おすすめの時間
                  </dt>
                  <dd className="mt-0.5 font-bold text-stone-800">
                    {spot.best_time}
                  </dd>
                </div>
              )}
              {spot.stay_minutes && (
                <div className="rounded-xl bg-stone-50 p-3">
                  <dt className="flex items-center gap-1 text-stone-500">
                    <Timer className="h-3 w-3" />
                    滞在時間の目安
                  </dt>
                  <dd className="mt-0.5 font-bold text-stone-800">
                    約{spot.stay_minutes}分
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
