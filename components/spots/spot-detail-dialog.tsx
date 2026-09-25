"use client";

import { useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Clock, Lightbulb, Star, Timer, X } from "lucide-react";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import type { Spot } from "@/lib/data/spots";
import { getCategory } from "@/lib/spots/categories";
import { formatRating, getRating } from "@/lib/spots/score";
import { SpotImage } from "./spot-image";
import { SpotReviewsSection } from "./spot-reviews";

/**
 * スポット詳細。「穴場を探す」と「AI旅プラン」の両方で使う（#24）
 * フォーカスの閉じ込め・閉じたあとのフォーカスの戻り・背面のスクロール止めは Radix の Dialog に任せる（#22）
 */
export function SpotDetailDialog({
  spot,
  onClose,
}: {
  spot: Spot | null;
  onClose: () => void;
}) {
  // 閉じるアニメーションの間も中身を出しておくため、最後に開いたスポットを覚えておく
  const [shown, setShown] = useState(spot);
  if (spot && spot !== shown) setShown(spot);
  // Trigger を使わずに開くので、閉じたら開く前にフォーカスがあった場所（カードなど）へ自分で戻す
  const returnFocusRef = useRef<HTMLElement | null>(null);

  if (!shown) return null;
  const meta = getCategory(shown.category);
  const rating = getRating(shown);

  return (
    <Dialog open={spot !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-stone-900/50 backdrop-blur-sm" />
        <DialogPrimitive.Content
          // キャッチコピーがないときは説明文がないことを Radix に伝える（警告を出さないため）
          {...(!shown.catchphrase && { "aria-describedby": undefined })}
          onOpenAutoFocus={() => {
            returnFocusRef.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }}
          onCloseAutoFocus={(e) => {
            const el = returnFocusRef.current;
            if (el?.isConnected) {
              e.preventDefault();
              el.focus();
            }
          }}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl duration-200 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 max-sm:h-[92dvh] max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=open]:slide-in-from-bottom sm:inset-x-auto sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:w-[calc(100%-2rem)] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-3xl sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]"
        >
          <div className="relative">
            <SpotImage
              category={shown.category}
              className="h-56 w-full text-6xl sm:h-72"
            />
            <DialogPrimitive.Close
              aria-label="閉じる"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
            <span
              className={`absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${meta.badge}`}
            >
              <meta.icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
              {meta.label}
            </span>
          </div>

          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <DialogPrimitive.Title className="text-xl font-extrabold text-stone-900">
                  {shown.name}
                </DialogPrimitive.Title>
                {rating !== null && (
                  <span className="flex shrink-0 items-center gap-1 font-bold text-amber-700">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    {formatRating(rating)}
                  </span>
                )}
              </div>
              {shown.catchphrase && (
                <DialogPrimitive.Description className="mt-1 text-sm text-stone-600">
                  {shown.catchphrase}
                </DialogPrimitive.Description>
              )}
            </div>

            {shown.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {shown.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {shown.description && (
              <p className="text-sm leading-relaxed text-stone-700">
                {shown.description}
              </p>
            )}

            {shown.local_tip && (
              <div className="flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-emerald-700">
                    地元の人のおすすめ
                  </p>
                  {shown.local_tip}
                </div>
              </div>
            )}

            {(shown.best_time || shown.stay_minutes) && (
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {shown.best_time && (
                  <div className="rounded-xl bg-stone-50 p-3">
                    <dt className="flex items-center gap-1 text-stone-500">
                      <Clock className="h-3 w-3" />
                      おすすめの時間
                    </dt>
                    <dd className="mt-0.5 font-bold text-stone-800">
                      {shown.best_time}
                    </dd>
                  </div>
                )}
                {shown.stay_minutes && (
                  <div className="rounded-xl bg-stone-50 p-3">
                    <dt className="flex items-center gap-1 text-stone-500">
                      <Timer className="h-3 w-3" />
                      滞在時間の目安
                    </dt>
                    <dd className="mt-0.5 font-bold text-stone-800">
                      約{shown.stay_minutes}分
                    </dd>
                  </div>
                )}
              </dl>
            )}

            <SpotReviewsSection key={shown.id} spotId={shown.id} />
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
