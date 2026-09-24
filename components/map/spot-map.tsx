"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import { Map } from "lucide-react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import type { Spot } from "@/lib/data/spots";
import { getCategory } from "@/lib/spots/categories";
import { cn } from "@/lib/utils";

/*
  Leaflet は読み込んだ時点で window を使うため、このファイルはサーバーで描画できない。
  使う側では必ず next/dynamic の ssr: false で読み込む（読み込み中は spot-map-skeleton.tsx）。

  const SpotMap = dynamic(
    () => import("@/components/map/spot-map").then((m) => m.SpotMap),
    { ssr: false, loading: () => <SpotMapSkeleton className="h-56" /> },
  );
*/

export type SpotMapProps = {
  /** ハイライトするスポット（おすすめ3件など）。大きく強調して表示 */
  highlighted?: Spot[];
  /** 経路（めぐる順）。番号付きのピンと線でつなぐ */
  route?: Spot[];
  /** そのほかのスポット。小さく表示 */
  others?: Spot[];
  /** ハイライトする地域名（地図の左上に出す） */
  areaName?: string;
  /**
   * 地域の境界（GeoJSON）。塗りつぶして表示し、表示範囲にも含める。
   * 参照が変わるたびに描き直すので、毎回新しいオブジェクトを作って渡さない（areas.boundary をそのまま渡す）
   */
  boundary?: GeoJsonObject | null;
  onSpotClick?: (spot: Spot) => void;
  /** ピンにマウスが乗ったらそのスポット、離れたら null を渡す */
  onSpotHover?: (spot: Spot | null) => void;
  className?: string;
};

/**
 * 地図タイル。国土地理院の淡色地図（出典の明示だけで申請不要）。
 * 利用規約と帰属表示は README の「地図タイル」を参照。
 */
const TILE_URL = "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener noreferrer">地理院タイル</a>';
/** 淡色地図があるズームの範囲 */
const MIN_ZOOM = 5;
const MAX_ZOOM = 18;

/** スポットがないときに見せる範囲（日本全体） */
const JAPAN_CENTER: L.LatLngTuple = [36.5, 138];
const JAPAN_ZOOM = 5;
/** スポットが1件だけのときのズーム */
const SINGLE_SPOT_ZOOM = 15;

const ROUTE_COLOR = "#c0432b";

/** スポットを載せる地図（Leaflet ＋ 地理院タイル） */
export function SpotMap({
  highlighted = [],
  route = [],
  others = [],
  areaName,
  boundary,
  onSpotClick,
  onSpotHover,
  className,
}: SpotMapProps) {
  const all = [...highlighted, ...route, ...others];
  const points = all.map((s): L.LatLngTuple => [s.lat, s.lng]);
  const routeLine = route.map((s): L.LatLngTuple => [s.lat, s.lng]);

  const eventHandlers = (spot: Spot): L.LeafletEventHandlerFnMap => ({
    click: () => onSpotClick?.(spot),
    mouseover: () => onSpotHover?.(spot),
    mouseout: () => onSpotHover?.(null),
  });

  return (
    // isolate: Leaflet 内部の z-index（最大 1000）がヘッダーやダイアログより前に出ないようにする
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-stone-200 bg-emerald-50/60",
        className,
      )}
    >
      <MapContainer
        center={JAPAN_CENTER}
        zoom={JAPAN_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        // 1ページに地図が複数並ぶので、ホイールでページのスクロールを奪わない
        scrollWheelZoom={false}
        zoomControl={false}
        className="h-full w-full bg-emerald-50/60"
      >
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
        />
        {/* 地域名のバッジと重ならないよう右上に置く */}
        <ZoomControl position="topright" />
        <FitBounds points={points} boundary={boundary} />
        {boundary && <BoundaryLayer data={boundary} />}

        {routeLine.length > 1 && (
          <Polyline
            positions={routeLine}
            pathOptions={{
              color: ROUTE_COLOR,
              weight: 3,
              dashArray: "8 6",
              lineCap: "round",
            }}
          />
        )}

        {others.map((spot) => (
          <Marker
            key={`other-${spot.id}`}
            position={[spot.lat, spot.lng]}
            icon={pinIcon(spot, "sm")}
            title={spot.name}
            alt={spot.name}
            eventHandlers={eventHandlers(spot)}
          />
        ))}
        {highlighted.map((spot) => (
          <Marker
            key={`highlighted-${spot.id}`}
            position={[spot.lat, spot.lng]}
            icon={pinIcon(spot, "lg")}
            title={spot.name}
            alt={spot.name}
            zIndexOffset={500}
            eventHandlers={eventHandlers(spot)}
          />
        ))}
        {route.map((spot, i) => (
          <Marker
            key={`route-${spot.id}`}
            position={[spot.lat, spot.lng]}
            icon={pinIcon(spot, "md", String(i + 1))}
            title={`${i + 1}. ${spot.name}`}
            alt={`${i + 1}. ${spot.name}`}
            zIndexOffset={1000}
            eventHandlers={eventHandlers(spot)}
          />
        ))}
      </MapContainer>

      {all.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/80 px-5 py-4 text-stone-500 shadow-sm backdrop-blur-sm">
            <Map className="h-6 w-6" />
            <span className="text-xs font-semibold">地図</span>
          </div>
        </div>
      )}

      {areaName && (
        <span className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink shadow-sm">
          📍 {areaName}
        </span>
      )}
    </div>
  );
}

/** 渡されたスポット（と境界）が全部入るように表示範囲を合わせる */
function FitBounds({
  points,
  boundary,
}: {
  points: L.LatLngTuple[];
  boundary?: GeoJsonObject | null;
}) {
  const map = useMap();
  // 配列は毎回作り直されるので、中身が変わったときだけ合わせ直す
  const pointsKey = points.map((p) => p.join(",")).join(";");

  useEffect(() => {
    const bounds = L.latLngBounds(points);
    const boundaryLayer = boundary ? toBoundaryLayer(boundary) : null;
    const boundaryBounds = boundaryLayer?.getBounds();
    if (boundaryBounds?.isValid()) bounds.extend(boundaryBounds);

    if (!bounds.isValid()) {
      map.setView(JAPAN_CENTER, JAPAN_ZOOM);
    } else if (points.length === 1 && !boundaryBounds?.isValid()) {
      map.setView(points[0], SINGLE_SPOT_ZOOM);
    } else {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
    }
    // points は pointsKey で比較する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pointsKey, boundary]);

  return null;
}

/** 地域の境界を塗りつぶす。data が変わったら描き直す */
function BoundaryLayer({ data }: { data: GeoJsonObject }) {
  const map = useMap();

  useEffect(() => {
    const layer = toBoundaryLayer(data)?.addTo(map);
    return () => {
      layer?.remove();
    };
  }, [map, data]);

  return null;
}

/** 境界の GeoJSON をレイヤーにする。DB の値が GeoJSON として読めなければ null（地図ごと落とさない） */
function toBoundaryLayer(data: GeoJsonObject) {
  try {
    return L.geoJSON(data, {
      style: {
        color: "#24463d", // ink
        weight: 2,
        fillColor: "#24463d",
        fillOpacity: 0.08,
      },
      interactive: false,
    });
  } catch (error) {
    console.error("地域の境界（GeoJSON）を読めませんでした", error);
    return null;
  }
}

/**
 * ピンの見た目。Leaflet 既定のマーカー画像はバンドル後にパスが解決できず表示されないため、
 * カテゴリの色と絵文字を HTML で描く divIcon を使う。
 */
const PIN_SIZE = { sm: 20, md: 28, lg: 40 } as const;

/** 再描画のたびに作り直すと Leaflet がピンの DOM を差し替えてしまうので、同じ見た目は使い回す */
const iconCache = new globalThis.Map<string, L.DivIcon>();

function pinIcon(spot: Spot, size: keyof typeof PIN_SIZE, label?: string) {
  const cacheKey = `${spot.category}:${size}:${label ?? ""}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const meta = getCategory(spot.category);
  const px = PIN_SIZE[size];
  const content = label ?? (size === "sm" ? "" : meta.emoji);
  const className = cn(
    "flex h-full w-full items-center justify-center rounded-full border-2 border-white font-bold text-white shadow-md transition-transform hover:scale-110",
    size === "sm" && "text-[10px] opacity-70",
    size === "md" && "text-xs",
    size === "lg" &&
      "text-lg ring-4 ring-amber-300/70 motion-safe:animate-pulse",
  );

  const icon = L.divIcon({
    // 既定の白い四角（.leaflet-div-icon）を消す
    className: "",
    html: `<span class="${className}" style="background:${label ? ROUTE_COLOR : meta.color}">${content}</span>`,
    iconSize: [px, px],
    iconAnchor: [px / 2, px / 2],
  });
  iconCache.set(cacheKey, icon);
  return icon;
}
