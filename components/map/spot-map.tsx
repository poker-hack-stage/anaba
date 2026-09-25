"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import { Map, MapPin } from "lucide-react";
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
  /** スポットも境界もないときに「地図」のプレースホルダーを出すか（既定は出す） */
  emptyPlaceholder?: boolean;
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
  emptyPlaceholder = true,
  className,
}: SpotMapProps) {
  const all = [...highlighted, ...route, ...others];
  const points = all.map((s): L.LatLngTuple => [s.lat, s.lng]);
  const routeLine = route.map((s): L.LatLngTuple => [s.lat, s.lng]);
  // 表示範囲と描画の両方で使うので、変換は1回だけにする
  const boundaryLayer = useMemo(
    () => (boundary ? toBoundaryLayer(boundary) : null),
    [boundary],
  );
  // cacheComponents で前のページが <Activity> に隠れると、effect の後始末で react-leaflet が map.remove() する。
  // 隠れている間は MapContainer を外し、表示に戻ったら作り直す（外さないと壊れた地図を再利用して落ちる）
  const [active, setActive] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 表示・非表示（Activity）に合わせて地図を作り直すため
    setActive(true);
    return () => setActive(false);
  }, []);

  return (
    // isolate: Leaflet 内部の z-index（最大 1000）がヘッダーやダイアログより前に出ないようにする
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-stone-200 bg-emerald-50/60",
        className,
      )}
    >
      {active && (
        <MapContainer
          center={JAPAN_CENTER}
          zoom={JAPAN_ZOOM}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          // 1ページに地図が複数並ぶので、ホイールでページのスクロールを奪わない
          scrollWheelZoom={false}
          // タッチ端末では1本指のドラッグで地図を動かさず、ページをスクロールさせる（ピンチと＋−ボタンで操作できる）
          dragging={!L.Browser.mobile}
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
          <FitBounds points={points} boundaryLayer={boundaryLayer} />
          {boundaryLayer && <BoundaryLayer layer={boundaryLayer} />}

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
            <SpotMarker
              key={`other-${spot.id}`}
              spot={spot}
              icon={pinIcon(spot, "sm")}
              title={spot.name}
              onSpotClick={onSpotClick}
              onSpotHover={onSpotHover}
            />
          ))}
          {highlighted.map((spot) => (
            <SpotMarker
              key={`highlighted-${spot.id}`}
              spot={spot}
              icon={pinIcon(spot, "lg")}
              title={spot.name}
              zIndexOffset={500}
              onSpotClick={onSpotClick}
              onSpotHover={onSpotHover}
            />
          ))}
          {route.map((spot, i) => (
            <SpotMarker
              key={`route-${spot.id}`}
              spot={spot}
              icon={pinIcon(spot, "md", String(i + 1))}
              title={`${i + 1}. ${spot.name}`}
              zIndexOffset={1000}
              onSpotClick={onSpotClick}
              onSpotHover={onSpotHover}
            />
          ))}
        </MapContainer>
      )}

      {emptyPlaceholder && all.length === 0 && !boundaryLayer && (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/80 px-5 py-4 text-stone-500 shadow-sm backdrop-blur-sm">
            <Map className="h-6 w-6" />
            <span className="text-xs font-semibold">地図</span>
          </div>
        </div>
      )}

      {areaName && (
        <span className="pointer-events-none absolute left-3 top-3 z-[1000] inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink shadow-sm">
          <MapPin aria-hidden className="h-3.5 w-3.5" />
          {areaName}
        </span>
      )}
    </div>
  );
}

/**
 * スポットのピン。Leaflet のマーカーは Tab で選べるが、Enter では click が出ないので、
 * キーボードでも詳細を開けるよう keydown を受ける。フォーカスはマウスオーバーと同じ扱いにする
 */
function SpotMarker({
  spot,
  icon,
  title,
  zIndexOffset,
  onSpotClick,
  onSpotHover,
}: {
  spot: Spot;
  icon: L.DivIcon;
  title: string;
  zIndexOffset?: number;
  onSpotClick?: (spot: Spot) => void;
  onSpotHover?: (spot: Spot | null) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  // focus / blur は付け直さずに最新の props を呼ぶ
  const latest = useRef({ spot, onSpotHover });
  useEffect(() => {
    latest.current = { spot, onSpotHover };
  });

  // Leaflet はマーカーの focus / blur をイベントとして出さないので、要素に直接付ける。
  // アイコンが変わると要素が作り直されるため icon ごとに付け直す
  useEffect(() => {
    const el = markerRef.current?.getElement();
    if (!el) return;
    const onFocus = () => latest.current.onSpotHover?.(latest.current.spot);
    const onBlur = () => latest.current.onSpotHover?.(null);
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);
    return () => {
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
    };
  }, [icon]);

  return (
    <Marker
      ref={markerRef}
      position={[spot.lat, spot.lng]}
      icon={icon}
      title={title}
      zIndexOffset={zIndexOffset}
      eventHandlers={{
        click: () => onSpotClick?.(spot),
        keydown: (e) => {
          const { key } = e.originalEvent;
          if (key === "Enter" || key === " ") {
            e.originalEvent.preventDefault();
            onSpotClick?.(spot);
          }
        },
        mouseover: () => onSpotHover?.(spot),
        mouseout: () => onSpotHover?.(null),
      }}
    />
  );
}

/** 渡されたスポット（と境界）が全部入るように表示範囲を合わせる */
function FitBounds({
  points,
  boundaryLayer,
}: {
  points: L.LatLngTuple[];
  boundaryLayer: L.GeoJSON | null;
}) {
  const map = useMap();
  // 配列は毎回作り直されるので、中身が変わったときだけ合わせ直す
  const pointsKey = points.map((p) => p.join(",")).join(";");

  useEffect(() => {
    const bounds = L.latLngBounds(points);
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
  }, [map, pointsKey, boundaryLayer]);

  return null;
}

/** 地域の境界を塗りつぶす。layer が変わったら描き直す */
function BoundaryLayer({ layer }: { layer: L.GeoJSON }) {
  const map = useMap();

  useEffect(() => {
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, layer]);

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
 * カテゴリの色とアイコンを HTML で描く divIcon を使う。
 * divIcon は HTML の文字列しか受け取らないので、カテゴリのアイコン（lucide-react）は SVG の文字列にして入れる。
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
  const content =
    label ??
    (size === "sm"
      ? ""
      : renderToStaticMarkup(
          <meta.icon aria-hidden className="h-[1.1em] w-[1.1em]" />,
        ));
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
