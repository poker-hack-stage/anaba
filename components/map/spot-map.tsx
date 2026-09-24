"use client";

import { Map } from "lucide-react";
import type { Spot } from "@/lib/data/spots";
import { getCategory } from "@/lib/spots/categories";
import { cn } from "@/lib/utils";

export type SpotMapProps = {
  /** ハイライトするスポット（おすすめ3件など）。大きく強調して表示 */
  highlighted?: Spot[];
  /** 経路（めぐる順）。番号付きのピンと線でつなぐ */
  route?: Spot[];
  /** そのほかのスポット。小さく表示 */
  others?: Spot[];
  /** ハイライトする地域名（地図の左上に出す） */
  areaName?: string;
  onSpotClick?: (spot: Spot) => void;
  className?: string;
};

/**
 * スポットを載せる地図。
 * TODO(#8, #16, #22): Leaflet（react-leaflet）＋ OpenStreetMap に差し替える。
 *   今は緯度経度を枠内に並べただけの簡易表示。props はそのまま使えるようにしてある。
 *   地域の境界（areas.boundary）のハイライトもここで行う。
 */
export function SpotMap({
  highlighted = [],
  route = [],
  others = [],
  areaName,
  onSpotClick,
  className,
}: SpotMapProps) {
  const all = [...highlighted, ...route, ...others];
  const project = createProjection(all);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-stone-200 bg-emerald-50/60",
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, #d6d3d1 1px, transparent 1px), linear-gradient(to bottom, #d6d3d1 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {all.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/80 px-5 py-4 text-stone-500 shadow-sm backdrop-blur-sm">
            <Map className="h-6 w-6" />
            <span className="text-xs font-semibold">地図</span>
          </div>
        </div>
      )}

      {areaName && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink shadow-sm">
          📍 {areaName}
        </span>
      )}

      {route.length > 1 && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polyline
            points={route
              .map((s) => project(s))
              .map(({ x, y }) => `${x},${y}`)
              .join(" ")}
            fill="none"
            stroke="#c0432b"
            strokeWidth="3"
            strokeDasharray="8 6"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      {others.map((spot) => (
        <Pin
          key={spot.id}
          spot={spot}
          position={project(spot)}
          onClick={onSpotClick}
          size="sm"
        />
      ))}
      {highlighted.map((spot) => (
        <Pin
          key={spot.id}
          spot={spot}
          position={project(spot)}
          onClick={onSpotClick}
          size="lg"
        />
      ))}
      {route.map((spot, i) => (
        <Pin
          key={spot.id}
          spot={spot}
          position={project(spot)}
          onClick={onSpotClick}
          size="md"
          label={String(i + 1)}
        />
      ))}
    </div>
  );
}

function Pin({
  spot,
  position,
  onClick,
  size,
  label,
}: {
  spot: Spot;
  position: { x: number; y: number };
  onClick?: (spot: Spot) => void;
  size: "sm" | "md" | "lg";
  label?: string;
}) {
  const meta = getCategory(spot.category);

  return (
    <button
      type="button"
      title={spot.name}
      onClick={() => onClick?.(spot)}
      className={cn(
        "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white font-bold text-white shadow-md transition-transform hover:scale-110",
        size === "sm" && "h-5 w-5 text-[10px] opacity-70",
        size === "md" && "h-7 w-7 text-xs",
        size === "lg" &&
          "h-10 w-10 text-lg ring-4 ring-amber-300/70 motion-safe:animate-pulse",
      )}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        background: label ? "#c0432b" : meta.color,
      }}
    >
      {label ?? (size === "sm" ? "" : meta.emoji)}
    </button>
  );
}

/** 緯度経度を、枠内の位置（%）に変換する関数を作る */
function createProjection(spots: Spot[]) {
  const PADDING = 12;
  const lats = spots.map((s) => s.lat);
  const lngs = spots.map((s) => s.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const scale = (value: number, min: number, max: number) =>
    max === min
      ? 50
      : PADDING + ((value - min) / (max - min)) * (100 - PADDING * 2);

  return (spot: Spot) => ({
    x: scale(spot.lng, minLng, maxLng),
    // 緯度は北が上なので反転する
    y: 100 - scale(spot.lat, minLat, maxLat),
  });
}
