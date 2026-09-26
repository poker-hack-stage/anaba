"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
} from "maplibre-gl";
import type {
  Feature,
  FeatureCollection,
  GeoJSON,
  GeoJsonObject,
} from "geojson";
import { Map, MapPin } from "lucide-react";
import type { Spot } from "@/lib/data/spots";
import { outsideOf, toAreaBoundary } from "@/lib/map/boundary";
import { computeBounds } from "@/lib/map/bounds";
import { getCategory } from "@/lib/spots/categories";
import { cn } from "@/lib/utils";

/*
  MapLibre は WebGL と window を使うため、このファイルはサーバーで描画できない。
  使う側では必ず next/dynamic の ssr: false で読み込む（読み込み中は spot-map-skeleton.tsx）。

  const SpotMap = dynamic(
    () => import("@/components/map/spot-map").then((m) => m.SpotMap),
    { ssr: false, loading: () => <SpotMapSkeleton className="h-56" /> },
  );
*/

/** 経路の1本（旅プランの1日ぶんなど） */
export type SpotRoute = {
  /** めぐる順のスポット。番号付きのピン（1から）と線でつなぐ */
  spots: Spot[];
  /** 線とピンの色（CSS の色）。省略すると朱 */
  color?: string;
  /** 凡例とピンの読み上げに出す名前（例: 「1日目」）。2本以上あるときは凡例を出す */
  name?: string;
};

export type SpotMapProps = {
  /** ハイライトするスポット（おすすめ3件など）。大きく強調して表示 */
  highlighted?: Spot[];
  /** 経路。日ごとに分けるときは複数渡し、線とピンを色分けする。経路どうしは線でつながない */
  routes?: SpotRoute[];
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
  /**
   * 表示範囲が変わったら、なめらかに移動する（既定は即時）。最初の表示は即時。
   * OS の「視差効果を減らす」が有効なら即時（MapLibre が切り替える）
   */
  animateMove?: boolean;
  /** スポットも境界もないときに「地図」のプレースホルダーを出すか（既定は出す） */
  emptyPlaceholder?: boolean;
  className?: string;
};

/**
 * 地図のスタイル。OpenFreeMap の Bright（ベクトル地図。無料・API キー不要）。
 * 利用条件と帰属表示は README の「地図タイル」を参照。帰属表示はスタイルに含まれ、地図の右下に出る
 */
const STYLE_URL = "https://tiles.openfreemap.org/styles/bright";
/**
 * ズームは MapLibre の値（512px のタイルが基準）。Leaflet（256px 基準）の値より 1 小さくすると同じ縮尺になる
 */
const MIN_ZOOM = 4;
const MAX_ZOOM = 17;

/** スポットがないときに見せる範囲（日本全体）。[経度, 緯度] */
const JAPAN_CENTER: [number, number] = [138, 36.5];
const JAPAN_ZOOM = 4;
/** スポットが1件だけのときのズーム */
const SINGLE_SPOT_ZOOM = 14;

/** 表示範囲の余白。右は＋−ボタン、下は帰属表示の分を広めに取る */
const FIT_PADDING = { top: 40, right: 56, bottom: 64, left: 40 };

const ROUTE_COLOR = "#c0432b";
const BOUNDARY_COLOR = "#24463d"; // ink
/** 地域の外側を暗くする色と濃さ。表示中の地域だけが見えるよう、外はほとんど見えなくする */
const OUTSIDE_COLOR = "#1c1917"; // stone-900
const OUTSIDE_OPACITY = 0.85;
/** 移動にかける時間。自動の切り替え（6秒ごと）より十分短くする */
const MOVE_DURATION_MS = 1200;

const ROUTE_SOURCE = "spot-route";
const BOUNDARY_SOURCE = "area-boundary";
const OUTSIDE_SOURCE = "area-outside";
const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

/**
 * 幅の狭い地図では帰属表示が最初は全文で出て、地図の下を覆う。MapLibre がたたむのは地図を動かしたときだけで、
 * スマホでは1本指のスクロールが地図の操作にならず、ずっと出たままになる。読み込みの後この時間が経ったら「i」ボタンにたたむ。
 * OpenStreetMap の帰属のガイドライン（https://osmfoundation.org/wiki/Licence/Attribution_Guidelines）で
 * 自動でたたんでよいのは5秒後からなので、それより短くしない
 */
const ATTRIBUTION_COLLAPSE_MS = 5000;

/**
 * MapLibre の Web Worker。バンドラーが出力に含めないので、scripts/copy-maplibre-worker.mjs が
 * npm install のあと（と npm run dev / build の前）に public/maplibre/ へ写したものを使う。地図を作る前に1回だけ設定する
 */
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

/**
 * 帰属表示。OpenFreeMap のスタイルが出すのは「Data from OpenStreetMap」だけなので、地域の境界（OpenStreetMap。ODbL）の
 * 帰属に求められる「© OpenStreetMap contributors」を足す（docs/boundaries.md）。MapLibre の既定の表示も残す
 */
const ATTRIBUTION = {
  compact: true,
  customAttribution: [
    '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OpenStreetMap contributors</a>',
    '<a href="https://maplibre.org/" target="_blank" rel="noopener">MapLibre</a>',
  ],
};

/** 地図の操作の案内（cooperativeGestures で出る）とボタンの読み上げを日本語にする */
const LOCALE = {
  "CooperativeGesturesHandler.WindowsHelpText":
    "Ctrl キーを押しながらスクロールで拡大・縮小",
  "CooperativeGesturesHandler.MacHelpText":
    "⌘ キーを押しながらスクロールで拡大・縮小",
  "CooperativeGesturesHandler.MobileHelpText": "2本指で地図を動かせます",
  "Map.Title": "地図",
  "NavigationControl.ZoomIn": "拡大",
  "NavigationControl.ZoomOut": "縮小",
};

/** スポットを載せる地図（MapLibre ＋ OpenFreeMap） */
export function SpotMap({
  highlighted = [],
  routes = [],
  others = [],
  areaName,
  boundary,
  onSpotClick,
  onSpotHover,
  animateMove = false,
  emptyPlaceholder = true,
  className,
}: SpotMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  // 線や塗りつぶし（source / layer）はスタイルを読み込んでからでないと足せない
  const [styleLoaded, setStyleLoaded] = useState(false);
  // スタイルを読めなかった（OpenFreeMap が落ちている、オフラインなど）。背景は描けないが、ピンは使える
  const [styleFailed, setStyleFailed] = useState(false);

  // 地図は effect の中で作り、後始末で消す。cacheComponents で前のページが <Activity> に隠れると
  // 後始末が走り、表示に戻ると作り直すので、壊れた地図を再利用しない
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const instance = new MapLibreMap({
      container,
      style: STYLE_URL,
      center: JAPAN_CENTER,
      zoom: JAPAN_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      // 1ページに地図が複数並ぶので、ページのスクロールを奪わない。
      // ホイールは Ctrl / ⌘ を押したときだけズーム、タッチ端末では1本指でページをスクロールし2本指で地図を動かす
      cooperativeGestures: true,
      // 回転・傾きは使わない（北が上のまま）
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      locale: LOCALE,
      attributionControl: ATTRIBUTION,
    });
    instance.touchZoomRotate.disableRotation();
    instance.keyboard.disableRotation();
    // 地域名のバッジと重ならないよう右上に置く
    instance.addControl(
      new NavigationControl({ showCompass: false }),
      "top-right",
    );
    let loaded = false;
    let collapseTimer: ReturnType<typeof setTimeout> | undefined;
    instance.once("load", () => {
      loaded = true;
      setStyleLoaded(true);
      collapseTimer = setTimeout(() => {
        // MapLibre がたたむ対象にしなかった地図（maplibregl-compact なし。幅 640px 超え）は全文のまま
        container
          .querySelector(".maplibregl-ctrl-attrib.maplibregl-compact")
          ?.classList.remove("maplibregl-compact-show");
      }, ATTRIBUTION_COLLAPSE_MS);
    });
    // setData に渡した GeoJSON の読み込みやタイルの取得の失敗は、ここに後から届く
    instance.on("error", (event) => {
      console.error("地図でエラーが起きました", event.error);
      // 読み込みの前で、どのソースにも属さないエラーはスタイルそのものの読み込みの失敗
      if (!loaded && !("sourceId" in event)) setStyleFailed(true);
    });
    setMap(instance);
    return () => {
      clearTimeout(collapseTimer);
      instance.remove();
      setMap(null);
      setStyleLoaded(false);
      setStyleFailed(false);
    };
  }, []);

  // 配列は毎回作り直されるので、中身が変わったときだけ描き直す
  const routeSpots = routes.flatMap((r) => r.spots);
  const points = [...highlighted, ...routeSpots, ...others].map(
    (s): [number, number] => [s.lng, s.lat],
  );
  const pointsKey = points.map((p) => p.join(",")).join(";");
  const routeKey = routes
    .map(
      (r) =>
        `${routeColor(r)}:${r.spots.map((s) => `${s.lng},${s.lat}`).join(";")}`,
    )
    .join("|");

  // 範囲を合わせたことのある地図。作り直した地図の最初の表示は即時にする
  const fittedMap = useRef<MapLibreMap | null>(null);

  // 表示範囲を合わせる
  useEffect(() => {
    if (!map) return;
    const animate = animateMove && fittedMap.current === map;
    fittedMap.current = map;
    const box = computeBounds(points, boundary);
    const boundaryBox = boundary ? computeBounds([], boundary) : null;
    // essential を付けないので、「視差効果を減らす」なら MapLibre が即時に切り替える
    const move = { animate, duration: MOVE_DURATION_MS };
    if (!box) {
      map.easeTo({ ...move, center: JAPAN_CENTER, zoom: JAPAN_ZOOM });
    } else if (points.length === 1 && !boundaryBox) {
      map.easeTo({ ...move, center: points[0], zoom: SINGLE_SPOT_ZOOM });
    } else {
      map.fitBounds(box, { ...move, padding: FIT_PADDING, maxZoom: 15 });
    }
    // points は pointsKey で比較する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pointsKey, boundary, animateMove]);

  // 境界の塗りつぶしと経路の線を置く場所を用意する
  useEffect(() => {
    if (!map || !styleLoaded) return;
    // 地域の外側を暗くする。外の地名も暗くするので、地名の文字より上に重ねる
    map.addSource(OUTSIDE_SOURCE, { type: "geojson", data: EMPTY });
    map.addLayer({
      id: `${OUTSIDE_SOURCE}-fill`,
      type: "fill",
      source: OUTSIDE_SOURCE,
      paint: { "fill-color": OUTSIDE_COLOR, "fill-opacity": OUTSIDE_OPACITY },
    });
    map.addSource(BOUNDARY_SOURCE, { type: "geojson", data: EMPTY });
    map.addLayer({
      id: `${BOUNDARY_SOURCE}-line`,
      type: "line",
      source: BOUNDARY_SOURCE,
      paint: { "line-color": BOUNDARY_COLOR, "line-width": 2.5 },
    });
    map.addSource(ROUTE_SOURCE, { type: "geojson", data: EMPTY });
    map.addLayer({
      id: `${ROUTE_SOURCE}-line`,
      type: "line",
      source: ROUTE_SOURCE,
      layout: { "line-cap": "round", "line-join": "round" },
      // 破線の長さは線の太さの倍数（8px と 6px の間隔）
      paint: {
        // 経路ごとの色（setData で properties.color に入れる）
        "line-color": ["get", "color"],
        "line-width": 3,
        "line-dasharray": [8 / 3, 6 / 3],
      },
    });
  }, [map, styleLoaded]);

  useEffect(() => {
    if (!map || !styleLoaded) return;
    // DB の値から座標が1つも取れなければ渡さない（読めない GeoJSON で地図ごと落とさない）。
    // setData は読み込みをワーカーで後から行うので、そこでの失敗は try/catch ではなく error イベントに届く
    const data =
      boundary && computeBounds([], boundary) ? (boundary as GeoJSON) : EMPTY;
    map.getSource<GeoJSONSource>(BOUNDARY_SOURCE)?.setData(data);
    const area = toAreaBoundary(boundary);
    map
      .getSource<GeoJSONSource>(OUTSIDE_SOURCE)
      ?.setData(area ? outsideOf(area) : EMPTY);
  }, [map, styleLoaded, boundary]);

  useEffect(() => {
    if (!map || !styleLoaded) return;
    const lines: FeatureCollection = {
      type: "FeatureCollection",
      features: routes
        .filter((r) => r.spots.length > 1)
        .map((r): Feature => ({
          type: "Feature",
          properties: { color: routeColor(r) },
          geometry: {
            type: "LineString",
            coordinates: r.spots.map((s) => [s.lng, s.lat]),
          },
        })),
    };
    map.getSource<GeoJSONSource>(ROUTE_SOURCE)?.setData(lines);
    // routes は routeKey で比較する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, styleLoaded, routeKey]);

  const markerProps = { onSpotClick, onSpotHover };
  // 経路が2本以上で名前があれば凡例を出す
  const showLegend = routes.length > 1 && routes.some((r) => r.name);

  return (
    // isolate: 地図の中の z-index がヘッダーやダイアログより前に出ないようにする。
    // ＋−ボタンと帰属表示はピンより前に出す（ピンに隠れて読めなくならないように）
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-stone-200 bg-emerald-50/60 [&_.maplibregl-control-container>div]:z-[5]",
        className,
      )}
    >
      {/* MapLibre が地図の要素に position: relative を付けるので、外側の枠で大きさを決める */}
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {map && (
        <>
          {others.map((spot) => (
            <SpotMarker
              key={`other-${spot.id}`}
              {...markerProps}
              map={map}
              spot={spot}
              size="sm"
              title={spot.name}
              zIndex={1}
            />
          ))}
          {highlighted.map((spot) => (
            <SpotMarker
              key={`highlighted-${spot.id}`}
              {...markerProps}
              map={map}
              spot={spot}
              size="lg"
              title={spot.name}
              zIndex={2}
            />
          ))}
          {routes.flatMap((r, ri) =>
            r.spots.map((spot, i) => (
              <SpotMarker
                key={`route-${ri}-${spot.id}`}
                {...markerProps}
                map={map}
                spot={spot}
                size="md"
                label={String(i + 1)}
                color={routeColor(r)}
                title={`${r.name ? `${r.name} ` : ""}${i + 1}. ${spot.name}`}
                zIndex={3}
              />
            )),
          )}
        </>
      )}

      {emptyPlaceholder && points.length === 0 && !boundary && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/80 px-5 py-4 text-stone-500 shadow-sm backdrop-blur-sm">
            <Map className="h-6 w-6" />
            <span className="text-xs font-semibold">地図</span>
          </div>
        </div>
      )}

      {styleFailed && (
        <p
          role="status"
          // 表示範囲の余白で下はピンが少ない。右下の帰属表示（読めないときは「MapLibre」だけ）の左に出す
          className="pointer-events-none absolute bottom-3 left-3 right-32 z-10 w-fit rounded-2xl bg-white/90 px-3 py-1 text-xs text-stone-600 shadow-sm"
        >
          地図を読み込めませんでした
        </p>
      )}

      {(areaName || showLegend) && (
        // 左上の表示（地域名と凡例）。両方あるときは縦に並べ、重ならないようにする
        <div className="pointer-events-none absolute left-3 right-14 top-3 z-10 flex flex-col items-start gap-1.5">
          {areaName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink shadow-sm">
              <MapPin aria-hidden className="h-3.5 w-3.5" />
              {areaName}
            </span>
          )}
          {showLegend && (
            // 凡例。ピンの番号は経路ごとに1からなので、色でどの日か分かるようにする
            <ul aria-label="凡例" className="flex flex-wrap gap-1.5">
              {routes.map((r, i) => (
                <li
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm"
                >
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: routeColor(r) }}
                  />
                  {r.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const PIN_SIZE = { sm: 20, md: 28, lg: 40 } as const;

/**
 * スポットのピン。MapLibre の Marker に渡した要素へ、React で button を描く。
 * button なので Tab で選べて Enter / Space で開ける。フォーカスはマウスオーバーと同じ扱いにする
 */
function SpotMarker({
  map,
  spot,
  size,
  label,
  color,
  title,
  zIndex,
  onSpotClick,
  onSpotHover,
}: {
  map: MapLibreMap;
  spot: Spot;
  size: keyof typeof PIN_SIZE;
  /** 経路・ハイライトの番号。あればアイコンの代わりに出す */
  label?: string;
  /** 経路のピンの色。省略するとカテゴリの色 */
  color?: string;
  title: string;
  /** 重なり順。経路 > ハイライト > そのほか */
  zIndex: number;
  onSpotClick?: (spot: Spot) => void;
  onSpotHover?: (spot: Spot | null) => void;
}) {
  const [element] = useState(() => {
    const el = document.createElement("div");
    el.style.zIndex = String(zIndex);
    return el;
  });

  useEffect(() => {
    const marker = new Marker({ element, anchor: "center" })
      .setLngLat([spot.lng, spot.lat])
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, element, spot.lng, spot.lat]);

  const meta = getCategory(spot.category);
  const px = PIN_SIZE[size];
  const Icon = meta.icon;

  return createPortal(
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={() => onSpotClick?.(spot)}
      // マウスだけを「乗せた」に数える。タッチのタップは詳細を開くだけにする（離れたことが分からず、強調が残るため）
      onPointerEnter={(e) => e.pointerType === "mouse" && onSpotHover?.(spot)}
      onPointerLeave={(e) => e.pointerType === "mouse" && onSpotHover?.(null)}
      // キーボードで選んだときだけ。タップやクリックで付いたフォーカスでは強調しない
      onFocus={(e) =>
        e.currentTarget.matches(":focus-visible") && onSpotHover?.(spot)
      }
      onBlur={() => onSpotHover?.(null)}
      style={{
        width: px,
        height: px,
        background: color ?? meta.color,
      }}
      className={cn(
        "flex cursor-pointer items-center justify-center rounded-full border-2 border-white font-bold text-white shadow-md transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        size === "sm" && "text-[10px] opacity-70",
        size === "md" && "text-xs",
        size === "lg" && "text-lg",
      )}
    >
      {label ??
        (size !== "sm" && <Icon aria-hidden className="h-[1.1em] w-[1.1em]" />)}
    </button>,
    element,
  );
}

function routeColor(route: SpotRoute): string {
  return route.color ?? ROUTE_COLOR;
}
