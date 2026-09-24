"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, MapPinned } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SpotMapSkeleton } from "@/components/map/spot-map-skeleton";
import { SpotCard } from "@/components/spots/spot-card";
import { SpotDetailDialog } from "@/components/spots/spot-detail-dialog";
import type { AreaWithSpots } from "@/lib/data/areas";
import type { Spot } from "@/lib/data/spots";
import { cn } from "@/lib/utils";

// Leaflet は window を使うので、サーバーでは描画しない
const SpotMap = dynamic(
  () => import("@/components/map/spot-map").then((m) => m.SpotMap),
  {
    ssr: false,
    loading: () => (
      <SpotMapSkeleton className="h-72 sm:h-96 lg:h-auto lg:min-h-[520px]" />
    ),
  },
);

/** 次の地域へ切り替わるまでの時間 */
const ROTATE_INTERVAL_MS = 6000;

/**
 * 「穴場を探す」のメイン部分。
 * 地図で1つの地域とおすすめ3件をハイライトし、情報パネルにその3件を出す。数秒ごとに次の地域へ切り替わる。
 */
export function AreaRotator({ areas }: { areas: AreaWithSpots[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);

  const area = areas[index];
  const next = useCallback(
    () => setIndex((i) => (i + 1) % areas.length),
    [areas.length],
  );
  const prev = () => setIndex((i) => (i - 1 + areas.length) % areas.length);

  // マウスを乗せている間と、詳細を開いている間は止める
  const stopped = paused || selectedSpot !== null || areas.length < 2;
  useEffect(() => {
    if (stopped) return;
    const id = setTimeout(next, ROTATE_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [index, stopped, next]);

  const closeDetail = useCallback(() => setSelectedSpot(null), []);

  return (
    <section
      className="grid gap-4 lg:grid-cols-[1fr_400px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* TODO(#1): 地図と情報パネルの左右（スマホでは上下）の配置を決める */}
      <SpotMap
        key={area?.id}
        areaName={area?.name}
        highlighted={area?.recommended}
        others={area?.spots.filter((s) => !area.recommended.includes(s))}
        onSpotClick={setSelectedSpot}
        className="h-72 animate-in fade-in sm:h-96 lg:h-auto lg:min-h-[520px]"
      />

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
              <li key={spot.id}>
                <SpotCard spot={spot} onSelect={setSelectedSpot} />
              </li>
            ))}
          </ul>
        )}

        {areas.length > 1 && (
          <div className="mt-auto flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={prev}
              aria-label="前の地域"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-1.5">
              {areas.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={a.name}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === index ? "w-6 bg-ink" : "w-2 bg-stone-300",
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              aria-label="次の地域"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <SpotDetailDialog spot={selectedSpot} onClose={closeDetail} />
    </section>
  );
}
