"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PanelRightClose, PanelRightOpen, SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SpotDetailDialog } from "@/components/spots/spot-detail-dialog";
import { Button } from "@/components/ui/button";
import type { AreaWithSpots } from "@/lib/data/areas";
import type { Spot } from "@/lib/data/spots";
import {
  filterAreas,
  hasActiveFilter,
  parseKeywords,
} from "@/lib/spots/filter";
import { AreaMap } from "./area-map";
import { AreaNav } from "./area-nav";
import { DiscoverSearch } from "./discover-search";
import { SpotPanel } from "./spot-panel";
import { useAutoRotate } from "./use-auto-rotate";
import { useDiscoverFilter } from "./use-discover-filter";
import { useMediaQuery } from "./use-media-query";
import { useOverlayInsets } from "./use-overlay-insets";

/**
 * 「穴場を探す」のメイン部分。
 * 地図で1つの地域とおすすめ3件をハイライトし、情報パネルにその3件を出す。数秒ごとに次の地域へ切り替わる。
 * PC（lg 以上）は、ページの横幅いっぱいに地図を広げ、左に検索・絞り込み、右に情報パネルを重ねる（docs/spec.md 6.1）。
 * 右の情報パネルは、左上に付いたタブで開け閉めできる。閉じるとタブごと右へ滑り、地図の右の端にタブ（「開く」）だけが残る。
 * スマホ・タブレット（lg 未満）は、地図をヘッダーと下部ナビのあいだいっぱいに出し、上端に検索欄、
 * 下端に情報パネル（地域の切り替え・地域名・横スクロールのおすすめのカード）を浮かべる（#142）。
 * 表示中のカードのスポットのピンを地図で目立たせる。
 * 地図のおすすめのピンにマウスを乗せると、情報パネルの同じカードを枠で強調する（#14）。
 * 検索欄・カテゴリで絞り込むと、条件に合うスポットがある地域だけを巡回する（docs/spec.md 画面-3）。
 * 地図は area-map.tsx、情報パネルは spot-panel.tsx、切り替えは use-auto-rotate.ts と area-nav.tsx、
 * 検索欄は discover-search.tsx と use-discover-filter.ts。
 */
export function AreaRotator({ areas }: { areas: AreaWithSpots[] }) {
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const search = useDiscoverFilter();
  const { filter } = search;

  const filtering = hasActiveFilter(filter);
  const filteredAreas = useMemo(
    () => filterAreas(areas, filter),
    [areas, filter],
  );

  // 地図を拡大・移動したら、地域が変わるまで巡回を止める。詳細を閉じたあとなどに次の地域へ切り替わって、
  // 見ていた場所を見失わないように（#151）
  const [mapMoved, setMapMoved] = useState(false);
  const holdMap = useCallback(() => setMapMoved(true), []);

  // 詳細を開いている間・検索欄にフォーカスがある間・地図を動かしたあとは止める
  const { index, next, prev, goTo, hoverHandlers, focusHandlers } =
    useAutoRotate(filteredAreas.length, {
      paused: selectedSpot !== null || search.focused || mapMoved,
    });

  // 直前まで出していた地域。条件が変わったときに、同じ地域に留まるのに使う
  const [prevAreaId, setPrevAreaId] = useState(filteredAreas[index]?.id);

  // 条件が変わったら、見ていた地域が条件に合えばその地域に留まり、合わなければ一致した最初の地域から巡回し直す
  // （条件を選ぶたびに先頭の地域へ飛ばないように）。
  // キーワードは絞り込みと同じ正規化をしてから比べる（前後の空白だけ変わっても戻さないように）
  const filterKey = `${parseKeywords(filter.q).join(" ")}|${filter.categories.join(",")}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    const stay = filteredAreas.findIndex((a) => a.id === prevAreaId);
    goTo(stay >= 0 ? stay : 0);
  }

  const area = filteredAreas[index];

  // 地図のピンにマウスが乗っているスポット。情報パネルの同じカードを強調する。
  // 地域が変わったら消す（ピンが消えると、マウスが離れた知らせが来ないため）
  const [hoveredSpotId, setHoveredSpotId] = useState<string | null>(null);
  // スマホで見えているおすすめのカードの番号。地域が変わったら最初のカードに戻す（カードの並びも作り直す）
  const [cardIndex, setCardIndex] = useState(0);
  if (prevAreaId !== area?.id) {
    setPrevAreaId(area?.id);
    setHoveredSpotId(null);
    setCardIndex(0);
    setMapMoved(false);
  }
  const visibleSpot =
    area?.recommended[Math.min(cardIndex, area.recommended.length - 1)];
  const hoverSpot = useCallback(
    (spot: Spot | null) => setHoveredSpotId(spot?.id ?? null),
    [],
  );

  const closeDetail = useCallback(() => setSelectedSpot(null), []);

  // PC で右の情報パネルを開いているか。スマホ・タブレットでは閉じない（パネルは地図の下に並ぶため）
  const [panelOpen, setPanelOpen] = useState(true);
  const lg = useMediaQuery("(min-width: 1024px)");
  const panelClosed = lg && !panelOpen;

  // スマホ・タブレットで、上に浮かべた検索欄と下に浮かべた情報パネルの高さ。地図の表示範囲の余白に使う
  const frameRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayInsets = useOverlayInsets(frameRef, searchRef, panelRef, !lg);

  return (
    // PC は main の横幅（max-w-7xl）の中で、周りに余白を残して地図を広げる。
    // 高さは画面からヘッダー（h-16）と上下の余白を引いた分に固定し、絞り込んでも地図が縮まないようにする（A-02）。
    // 閉じた右のパネルがはみ出さないよう、枠の外は切る。
    // スマホ（sm 未満）は、main の左右と上の余白を打ち消して画面の端まで広げ、高さはヘッダー（h-14 と下の枠線 1px）と下部ナビ（62px）のあいだにする。
    // タブレットは、sm〜md はヒーローの下に下部ナビの上までの高さで、md 以上（下部ナビがない）は PC と同じ高さで出す
    <div
      ref={frameRef}
      className="relative -mx-4 -mt-5 h-[calc(100dvh-3.5rem-1px-62px)] overflow-hidden sm:mx-0 sm:mt-0 sm:h-[calc(100dvh-4rem-1px-62px-2.5rem)] sm:rounded-2xl md:h-[calc(100dvh-7rem)]"
    >
      {/* 左のパネル（PC）。幅は area-map.tsx の OVERLAY_PANEL_WIDTH と合わせる。
          スマホ・タブレットでは地図の上端に浮かべる。スマホは検索欄だけが見え、そのまわりで地図を触れるよう、枠は触れないようにする */}
      <div
        ref={searchRef}
        className="max-lg:absolute max-lg:inset-x-3 max-lg:top-3 max-lg:z-20 max-sm:pointer-events-none sm:max-lg:rounded-2xl sm:max-lg:border sm:max-lg:border-stone-200 sm:max-lg:bg-white/95 sm:max-lg:p-3 sm:max-lg:shadow-lg sm:max-lg:backdrop-blur-sm lg:absolute lg:left-4 lg:top-4 lg:z-10 lg:max-h-[calc(100%-2rem)] lg:w-[300px] lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-stone-200 lg:bg-white/95 lg:p-4 lg:shadow-lg lg:backdrop-blur-sm xl:w-[340px]"
      >
        <DiscoverSearch
          text={search.text}
          onTextChange={search.setText}
          onSubmit={search.flush}
          inputProps={search.inputProps}
          categories={filter.categories}
          onToggleCategory={search.toggleCategory}
          onClear={search.clear}
          summary={
            filtering
              ? {
                  areas: filteredAreas.length,
                  spots: filteredAreas.reduce(
                    (sum, a) => sum + a.matchedSpots.length,
                    0,
                  ),
                }
              : null
          }
        />
      </div>

      {/* contents で枠をなくし、中の地図と情報パネルを外側の枠に重ねる。
          Tab で条件の次にすぐ情報パネルへ行けるよう、DOM では情報パネルを地図より前に置く（A-10） */}
      <section className="contents" {...hoverHandlers} {...focusHandlers}>
        {/* 右のパネル（PC）。下は地図の帰属表示が見えるよう空ける。幅は area-map.tsx の OVERLAY_PANEL_WIDTH と合わせる。
            外側の枠は開閉で横に滑らせるだけで、地図の操作を邪魔しないよう pointer-events を切る。
            スマホ・タブレットでは地図の下端に浮かべる。下部ナビがある幅（md 未満）は、真ん中の＋ボタン（ナビから 28px 飛び出す）と
            重ならないよう下を 36px 空ける。低い画面（横向き）では検索欄の下までに収め、中をスクロールさせる */}
        <div
          ref={panelRef}
          className={`max-lg:absolute max-lg:inset-x-3 max-lg:bottom-9 max-lg:z-10 max-lg:flex max-lg:max-h-[calc(100%-6.5rem)] max-lg:flex-col sm:max-lg:right-auto sm:max-lg:w-[420px] md:max-lg:bottom-3 lg:pointer-events-none lg:absolute lg:bottom-20 lg:right-4 lg:top-4 lg:z-10 lg:w-[360px] lg:transition-transform lg:duration-500 lg:ease-in-out lg:motion-reduce:transition-none xl:w-[420px] ${panelClosed ? "lg:translate-x-[calc(100%+1rem)]" : ""}`}
        >
          {/* パネルの左上に付いたタブ（PC）。パネルと一緒に滑るので、閉じると地図の右の端に残る。
              開いているときは「閉じる」、閉じているときは「開く」を縦書きで出す */}
          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            aria-controls="discover-panel"
            aria-expanded={!panelClosed}
            className="absolute right-full top-3 hidden w-9 flex-col items-center gap-1.5 rounded-l-xl border border-r-0 border-stone-200 bg-white/95 py-3 text-xs font-bold text-ink shadow-md backdrop-blur-sm hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:pointer-events-auto lg:flex"
          >
            {panelClosed ? (
              <>
                <PanelRightOpen aria-hidden className="h-4 w-4 shrink-0" />
                <span className="[writing-mode:vertical-rl]">開く</span>
                <span className="sr-only">（地域の情報）</span>
              </>
            ) : (
              <>
                <PanelRightClose aria-hidden className="h-4 w-4 shrink-0" />
                <span className="[writing-mode:vertical-rl]">閉じる</span>
                <span className="sr-only">（地域の情報）</span>
              </>
            )}
          </button>
          <div
            id="discover-panel"
            // 閉じている間は、中のカードやボタンに Tab で行かないようにする
            inert={panelClosed}
            className="max-lg:min-h-0 max-lg:overflow-y-auto max-lg:rounded-2xl max-lg:shadow-lg lg:pointer-events-auto lg:max-h-full lg:overflow-y-auto lg:rounded-2xl lg:shadow-lg"
          >
            {filtering && !area ? (
              <NoMatchPanel onClear={search.clear} />
            ) : (
              <SpotPanel
                area={area}
                nextArea={filteredAreas[(index + 1) % filteredAreas.length]}
                activeSpotId={hoveredSpotId}
                cardIndex={cardIndex}
                onCardIndexChange={setCardIndex}
                onSelectSpot={setSelectedSpot}
                nav={
                  <AreaNav
                    areas={filteredAreas}
                    index={index}
                    onPrev={prev}
                    onNext={next}
                    onSelect={goTo}
                  />
                }
              />
            )}
          </div>
        </div>

        <div className="absolute inset-0">
          <AreaMap
            area={area}
            allAreas={areas}
            rightPanelOpen={!panelClosed}
            overlayInsets={overlayInsets}
            activeSpotId={visibleSpot?.id}
            onSpotClick={setSelectedSpot}
            onSpotHover={hoverSpot}
            onUserMove={holdMap}
          />
        </div>

        <SpotDetailDialog spot={selectedSpot} onClose={closeDetail} />
      </section>

      {/* スマホ（sm 未満）はページをスクロールさせずフッターを出さないので（app/globals.css、#155）、
          フッターの「写真の出典」（CC BY・CC BY-SA の表示の条件、#67）へのリンクを、情報パネルの下の右端に出す。
          真ん中は下部ナビの＋ボタンが飛び出すので、右に寄せる。押せる範囲は高さ 24px（WCAG 2.5.8） */}
      <Link
        href="/credits"
        className="absolute bottom-1.5 right-3 z-10 flex min-h-6 items-center rounded-full bg-white/85 px-2 text-[11px] text-stone-600 underline underline-offset-2 shadow-sm backdrop-blur-sm hover:text-shu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
      >
        写真の出典
      </Link>
    </div>
  );
}

/**
 * 絞り込みで1件も当たらなかったときの情報パネル。
 * スマホ・タブレットでは地図の下端に浮かべるので、点線の枠をなくして余白を詰め、地図を隠しすぎないようにする（#142）
 */
function NoMatchPanel({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 max-lg:gap-2 max-lg:bg-white/95 max-lg:p-3 max-lg:backdrop-blur-sm">
      <EmptyState
        icon={SearchX}
        title="条件に合う穴場が見つかりませんでした"
        description="キーワードを短くするか、カテゴリを減らしてみてください。"
        className="flex-1 max-lg:border-0 max-lg:bg-transparent max-lg:px-2 max-lg:py-2"
      />
      <Button variant="outline" onClick={onClear} className="self-center">
        条件をクリア
      </Button>
    </div>
  );
}
