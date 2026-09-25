"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { SpotMapSkeleton } from "@/components/map/spot-map-skeleton";
import type { AreaWithSpots } from "@/lib/data/areas";
import type { Spot } from "@/lib/data/spots";
import { toAreaBoundary } from "@/lib/map/boundary";

const MAP_CLASS_NAME = "h-72 sm:h-96 lg:h-auto lg:min-h-[520px]";

// 地図（MapLibre）は window と WebGL を使うので、サーバーでは描画しない
const SpotMap = dynamic(
  () => import("@/components/map/spot-map").then((m) => m.SpotMap),
  { ssr: false, loading: () => <SpotMapSkeleton className={MAP_CLASS_NAME} /> },
);

/**
 * 「穴場を探す」の地図部分。表示中の地域の境界を塗り、おすすめ3件に情報パネルと同じ番号のピンを立てる。
 * 地域が変わっても地図は作り直さず、新しい地域へなめらかに移動する。area がないときは日本全体を出す。
 * 地図コンポーネントの読み込みはこのファイルだけで行う。
 */
export function AreaMap({
  area,
  onSpotClick,
  onSpotHover,
}: {
  area?: AreaWithSpots;
  onSpotClick: (spot: Spot) => void;
  /** ピンにマウスが乗ったら（キーボードで選んだら）そのスポット、離れたら null */
  onSpotHover?: (spot: Spot | null) => void;
}) {
  // 同じ地域なら同じオブジェクトが返るので、絞り込みで地域を作り直しても境界は描き直さない
  const boundary = useMemo(
    () => toAreaBoundary(area?.boundary),
    [area?.boundary],
  );

  return (
    <SpotMap
      areaName={area?.name}
      boundary={boundary}
      highlighted={area?.recommended}
      numberHighlighted
      others={area?.spots.filter((s) => !area.recommended.includes(s))}
      onSpotClick={onSpotClick}
      onSpotHover={onSpotHover}
      animateMove
      // 絞り込みで0件のとき（area がない）は、読み込みに失敗したように見えないようプレースホルダーを出さない
      emptyPlaceholder={area !== undefined}
      className={`${MAP_CLASS_NAME} animate-in fade-in`}
    />
  );
}
