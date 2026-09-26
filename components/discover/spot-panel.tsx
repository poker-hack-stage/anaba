"use client";

import { useEffect, type ReactNode } from "react";
import { MapPinned } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SpotCard, preloadSpotCardImages } from "@/components/spots/spot-card";
import type { AreaWithSpots } from "@/lib/data/areas";
import type { Spot } from "@/lib/data/spots";

/**
 * 情報パネル。ピックアップ中の地域の見出しと、おすすめ3件のスポットを並べる。
 * `nav`（前へ／次へ・ドット）は、パネルのいちばん上に置く。
 * 最初の画面で見えるように（A-13）、またカードから離して、スポットを切り替えるボタンと間違えないようにする。
 * カードの上には「おすすめのN か所」の見出しを置き、地域の説明とカードを区切る。
 * カードは PC（lg 以上）で写真をカードの幅いっぱいに大きく出す（`variant="panel"`）。
 * `activeSpotId` のカード（地図でピンにマウスが乗っているスポット）を枠で強調する。
 * `nextArea`（次に切り替わる地域）のおすすめ3件の写真は先に読んでおき、切り替えたときに写真の枠が空かないようにする。
 */
export function SpotPanel({
  area,
  nextArea,
  activeSpotId,
  onSelectSpot,
  nav,
}: {
  area?: AreaWithSpots;
  nextArea?: AreaWithSpots;
  activeSpotId?: string | null;
  onSelectSpot: (spot: Spot) => void;
  nav?: ReactNode;
}) {
  useEffect(() => {
    if (nextArea) preloadSpotCardImages(nextArea.recommended, "panel");
  }, [nextArea]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5">
      {/* いちばん上に、地域を切り替えるボタン（nav）だけを置く。
          カードのすぐ上に置くと、スポットを切り替えるボタンと間違えやすいため */}
      {nav}

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
        <div className="flex flex-col gap-2 border-t border-stone-200 pt-4">
          <p
            id="discover-panel-spots"
            className="text-xs font-bold text-stone-600"
          >
            おすすめの{area.recommended.length}か所
          </p>
          <ul
            key={`spots-${area.id}`}
            aria-labelledby="discover-panel-spots"
            className="flex flex-col gap-3 animate-in fade-in"
          >
            {area.recommended.map((spot) => (
              <li
                key={spot.id}
                data-active={spot.id === activeSpotId || undefined}
                className="rounded-2xl transition-shadow data-[active]:ring-2 data-[active]:ring-ink data-[active]:ring-offset-2"
              >
                <SpotCard spot={spot} onSelect={onSelectSpot} variant="panel" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
