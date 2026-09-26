"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { SpotMapSkeleton } from "@/components/map/spot-map-skeleton";
import type { FitPadding } from "@/components/map/spot-map";
import type { AreaWithSpots } from "@/lib/data/areas";
import type { Spot } from "@/lib/data/spots";
import { toAreaBoundary } from "@/lib/map/boundary";
import { useMediaQuery } from "./use-media-query";

/** 地図の大きさ。スマホ・タブレットは高さを決め、PC（lg 以上）は親（area-rotator.tsx の地図の枠）に合わせる */
const MAP_CLASS_NAME = "h-72 sm:h-96 lg:h-full";

/**
 * PC で地図の上に重ねるパネルの幅（px）。area-rotator.tsx の `lg:w-[300px] xl:w-[340px]`（左）・
 * `lg:w-[360px] xl:w-[420px]`（右）と合わせる。変えるときは両方直す
 */
export const OVERLAY_PANEL_WIDTH = {
  lg: { left: 300, right: 360 },
  xl: { left: 340, right: 420 },
} as const;
/** パネルと画面の端のすき間（left-4・right-4）と、パネルと表示範囲のすき間 */
const PANEL_GAP = 16 + 24;

// 地図（MapLibre）は window と WebGL を使うので、サーバーでは描画しない
const SpotMap = dynamic(
  () => import("@/components/map/spot-map").then((m) => m.SpotMap),
  { ssr: false, loading: () => <SpotMapSkeleton className={MAP_CLASS_NAME} /> },
);

/**
 * 「穴場を探す」の地図部分。表示中の地域の境界を黒い枠で囲み、おすすめ3件を大きなピンで出す。
 * 絞り込み中は、条件に合うスポット（`matchedSpots`）だけを小さな点で出す（A-07）。
 * 地域が変わっても地図は作り直さず、新しい地域へなめらかに移動する。
 * area がない（絞り込みで0件）ときは、`allAreas` の全地域が入る範囲を出す（docs/spec.md 画面-3、K-6）。
 * PC（lg 以上）では地図の上に左右のパネルが重なるので、その幅だけ表示範囲の余白を広げ、
 * 地域名のバッジを左のパネルの右に置く。＋−ボタンは、スマホ・PC とも左下に置く。
 * 地図コンポーネントの読み込みはこのファイルだけで行う。
 */
export function AreaMap({
  area,
  allAreas,
  rightPanelOpen = true,
  onSpotClick,
  onSpotHover,
  onUserMove,
}: {
  /** 表示中の地域。絞り込み中は `matchedSpots`（条件に合うスポット）が付く */
  area?: AreaWithSpots & { matchedSpots?: Spot[] };
  /** 全地域。area がないときの表示範囲に使う */
  allAreas?: AreaWithSpots[];
  /** PC で右の情報パネルが開いているか。閉じているときは、表示範囲の右の余白を狭める */
  rightPanelOpen?: boolean;
  onSpotClick: (spot: Spot) => void;
  /** ピンにマウスが乗ったら（キーボードで選んだら）そのスポット、離れたら null */
  onSpotHover?: (spot: Spot | null) => void;
  /** 利用者が地図を拡大・移動し始めた（地域が変わって地図が動くときは呼ばない） */
  onUserMove?: () => void;
}) {
  // 同じ地域なら同じオブジェクトが返るので、絞り込みで地域を作り直しても境界は描き直さない
  const boundary = useMemo(
    () => toAreaBoundary(area?.boundary),
    [area?.boundary],
  );

  const others = useMemo(
    () =>
      (area?.matchedSpots ?? area?.spots)?.filter(
        (s) => !area?.recommended.includes(s),
      ),
    [area],
  );

  // 0件のときに全地域が入る範囲を出す。地域の中心を使う（境界まで入れると、端の余白がばらつくため）
  const fitPoints = useMemo(
    () =>
      area
        ? undefined
        : allAreas?.map((a): [number, number] => [a.center_lng, a.center_lat]),
    [area, allAreas],
  );

  const lg = useMediaQuery("(min-width: 1024px)");
  const xl = useMediaQuery("(min-width: 1280px)");
  const fitPadding = useMemo((): FitPadding | undefined => {
    if (!lg) return undefined;
    const width = xl ? OVERLAY_PANEL_WIDTH.xl : OVERLAY_PANEL_WIDTH.lg;
    return {
      top: 40,
      right: rightPanelOpen ? width.right + PANEL_GAP : 64,
      bottom: 64,
      left: width.left + PANEL_GAP,
    };
  }, [lg, xl, rightPanelOpen]);

  return (
    <SpotMap
      areaName={area?.name}
      boundary={boundary}
      highlighted={area?.recommended}
      others={others}
      fitPoints={fitPoints}
      fitPadding={fitPadding}
      // ＋−ボタンは、スマホ・PC とも左下に置く（PC では右上に情報パネルが重なるため。地図を作るときにだけ読む）
      controlPosition="bottom-left"
      labelClassName="lg:left-[332px] xl:left-[372px]"
      onSpotClick={onSpotClick}
      onSpotHover={onSpotHover}
      onUserMove={onUserMove}
      animateMove
      // 絞り込みで0件のとき（area がない）は、読み込みに失敗したように見えないようプレースホルダーを出さない
      emptyPlaceholder={area !== undefined}
      className={`${MAP_CLASS_NAME} animate-in fade-in`}
    />
  );
}
