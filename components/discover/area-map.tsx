"use client";

import { SpotMap } from "@/components/map/spot-map";
import type { AreaWithSpots } from "@/lib/data/areas";
import type { Spot } from "@/lib/data/spots";

/**
 * 「穴場を探す」の地図部分。表示中の地域とおすすめ3件をハイライトする。
 * 地図コンポーネントの読み込みはこのファイルだけで行う。
 */
export function AreaMap({
  area,
  onSpotClick,
}: {
  area?: AreaWithSpots;
  onSpotClick: (spot: Spot) => void;
}) {
  return (
    <SpotMap
      key={area?.id}
      areaName={area?.name}
      highlighted={area?.recommended}
      others={area?.spots.filter((s) => !area.recommended.includes(s))}
      onSpotClick={onSpotClick}
      className="h-72 animate-in fade-in sm:h-96 lg:h-auto lg:min-h-[520px]"
    />
  );
}
