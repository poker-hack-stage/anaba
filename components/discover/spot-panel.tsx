"use client";

import { useEffect, type ReactNode } from "react";
import { MapPinned } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SpotCard, preloadSpotCardImages } from "@/components/spots/spot-card";
import type { AreaWithSpots } from "@/lib/data/areas";
import type { Spot } from "@/lib/data/spots";

/**
 * 情報パネル。ピックアップ中の地域の見出しと、おすすめ3件のスポットを並べる。
 * `footer` はパネルの下端に置く（前へ／次へ・ドット）。
 * `activeSpotId` のカード（地図でピンにマウスが乗っているスポット）を枠で強調する。
 * `nextArea`（次に切り替わる地域）のおすすめ3件の写真は先に読んでおき、切り替えたときに写真の枠が空かないようにする。
 */
export function SpotPanel({
  area,
  nextArea,
  activeSpotId,
  onSelectSpot,
  footer,
}: {
  area?: AreaWithSpots;
  nextArea?: AreaWithSpots;
  activeSpotId?: string | null;
  onSelectSpot: (spot: Spot) => void;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (nextArea) preloadSpotCardImages(nextArea.recommended);
  }, [nextArea]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5">
      <div
        key={`heading-${area?.id}`}
        className="animate-in fade-in slide-in-from-right-4"
      >
        <p className="text-xs font-bold text-shu">ピックアップ中の地域</p>
        <h2 className="font-brand text-xl font-bold text-ink">
          {area?.name ?? "地域はまだありません"}
        </h2>
        {area?.catchphrase && (
          <p className="mt-1 text-sm text-stone-600">{area.catchphrase}</p>
        )}
      </div>

      {!area || area.recommended.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="スポットはまだありません"
          description="地域とスポットが登録されると、ここにおすすめの3か所が表示されます。"
          className="flex-1"
        />
      ) : (
        <ul
          key={`spots-${area.id}`}
          className="flex flex-col gap-3 animate-in fade-in"
        >
          {area.recommended.map((spot) => (
            <li
              key={spot.id}
              data-active={spot.id === activeSpotId || undefined}
              className="rounded-2xl transition-shadow data-[active]:ring-2 data-[active]:ring-ink data-[active]:ring-offset-2"
            >
              <SpotCard spot={spot} onSelect={onSelectSpot} />
            </li>
          ))}
        </ul>
      )}

      {footer}
    </div>
  );
}
