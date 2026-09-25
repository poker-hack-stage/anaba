"use client";

import dynamic from "next/dynamic";
import { SpotMapSkeleton } from "@/components/map/spot-map-skeleton";
import type { AreaWithSpots } from "@/lib/data/areas";
import type { Spot } from "@/lib/data/spots";

const MAP_CLASS_NAME = "h-72 sm:h-96 lg:h-auto lg:min-h-[520px]";

// 地図（MapLibre）は window と WebGL を使うので、サーバーでは描画しない
const SpotMap = dynamic(
  () => import("@/components/map/spot-map").then((m) => m.SpotMap),
  { ssr: false, loading: () => <SpotMapSkeleton className={MAP_CLASS_NAME} /> },
);

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
      className={`${MAP_CLASS_NAME} animate-in fade-in`}
    />
  );
}
