"use client";

import { useCallback, useState } from "react";
import { SpotDetailDialog } from "@/components/spots/spot-detail-dialog";
import type { AreaWithSpots } from "@/lib/data/areas";
import type { Spot } from "@/lib/data/spots";
import { AreaMap } from "./area-map";
import { AreaNav } from "./area-nav";
import { SpotPanel } from "./spot-panel";
import { useAutoRotate } from "./use-auto-rotate";

/**
 * 「穴場を探す」のメイン部分。
 * 地図で1つの地域とおすすめ3件をハイライトし、情報パネルにその3件を出す。数秒ごとに次の地域へ切り替わる。
 * 地図は area-map.tsx、情報パネルは spot-panel.tsx、切り替えは use-auto-rotate.ts と area-nav.tsx。
 */
export function AreaRotator({ areas }: { areas: AreaWithSpots[] }) {
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  // 詳細を開いている間は止める
  const {
    index,
    next,
    prev,
    goTo,
    isPaused,
    togglePaused,
    hoverHandlers,
    focusHandlers,
  } = useAutoRotate(areas.length, { paused: selectedSpot !== null });

  const area = areas[index];
  const closeDetail = useCallback(() => setSelectedSpot(null), []);

  return (
    <section
      className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_400px]"
      {...hoverHandlers}
      {...focusHandlers}
    >
      {/* TODO(#1): 地図と情報パネルの左右（スマホでは上下）の配置を決める */}
      <AreaMap area={area} onSpotClick={setSelectedSpot} />

      <SpotPanel
        area={area}
        onSelectSpot={setSelectedSpot}
        footer={
          <AreaNav
            areas={areas}
            index={index}
            onPrev={prev}
            onNext={next}
            onSelect={goTo}
            paused={isPaused}
            onTogglePause={togglePaused}
          />
        }
      />

      <SpotDetailDialog spot={selectedSpot} onClose={closeDetail} />
    </section>
  );
}
