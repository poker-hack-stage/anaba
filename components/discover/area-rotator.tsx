"use client";

import { useCallback, useMemo, useState } from "react";
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

/**
 * 「穴場を探す」のメイン部分。
 * 地図で1つの地域とおすすめ3件をハイライトし、情報パネルにその3件を出す。数秒ごとに次の地域へ切り替わる。
 * PC（lg 以上）は、ページの横幅いっぱいに地図を広げ、左に検索・絞り込み、右に情報パネルを重ねる（docs/spec.md 6.1）。
 * 右の情報パネルは、左上に付いたタブで開け閉めできる。閉じるとタブごと右へ滑り、地図の右の端にタブ（「開く」）だけが残る。
 * スマホ・タブレットは、検索欄・地図・情報パネルを縦に並べる。
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

  // 詳細を開いている間・検索欄にフォーカスがある間は止める
  const { index, next, prev, goTo, hoverHandlers, focusHandlers } =
    useAutoRotate(filteredAreas.length, {
      paused: selectedSpot !== null || search.focused,
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
  if (prevAreaId !== area?.id) {
    setPrevAreaId(area?.id);
    setHoveredSpotId(null);
  }
  const hoverSpot = useCallback(
    (spot: Spot | null) => setHoveredSpotId(spot?.id ?? null),
    [],
  );

  const closeDetail = useCallback(() => setSelectedSpot(null), []);

  // PC で右の情報パネルを開いているか。スマホ・タブレットでは閉じない（パネルは地図の下に並ぶため）
  const [panelOpen, setPanelOpen] = useState(true);
  const lg = useMediaQuery("(min-width: 1024px)");
  const panelClosed = lg && !panelOpen;

  return (
    // PC は main の横幅（max-w-7xl）の中で、周りに余白を残して地図を広げる。
    // 高さは画面からヘッダー（h-16）と上下の余白を引いた分に固定し、絞り込んでも地図が縮まないようにする（A-02）。
    // 閉じた右のパネルがはみ出さないよう、枠の外は切る
    <div className="flex flex-col gap-4 lg:relative lg:h-[calc(100dvh-7rem)] lg:overflow-hidden lg:rounded-2xl">
      {/* 左のパネル（PC）。幅は area-map.tsx の OVERLAY_PANEL_WIDTH と合わせる */}
      <div className="lg:absolute lg:left-4 lg:top-4 lg:z-10 lg:max-h-[calc(100%-2rem)] lg:w-[300px] lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-stone-200 lg:bg-white/95 lg:p-4 lg:shadow-lg lg:backdrop-blur-sm xl:w-[340px]">
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

      {/* PC では contents で枠をなくし、中の地図と右のパネルを外側の枠に重ねる。
          Tab で条件の次にすぐ情報パネルへ行けるよう、DOM では情報パネルを地図より前に置き、
          スマホ・タブレットでは order で地図を上に並べる（A-10） */}
      <section
        className="flex flex-col gap-4 lg:contents"
        {...hoverHandlers}
        {...focusHandlers}
      >
        {/* 右のパネル（PC）。下は地図の帰属表示が見えるよう空ける。幅は area-map.tsx の OVERLAY_PANEL_WIDTH と合わせる。
            外側の枠は開閉で横に滑らせるだけで、地図の操作を邪魔しないよう pointer-events を切る */}
        <div
          className={`order-2 lg:pointer-events-none lg:absolute lg:bottom-20 lg:right-4 lg:top-4 lg:z-10 lg:w-[360px] lg:transition-transform lg:duration-500 lg:ease-in-out lg:motion-reduce:transition-none xl:w-[420px] ${panelClosed ? "lg:translate-x-[calc(100%+1rem)]" : ""}`}
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
            className="lg:pointer-events-auto lg:max-h-full lg:overflow-y-auto lg:rounded-2xl lg:shadow-lg"
          >
            {filtering && !area ? (
              <NoMatchPanel onClear={search.clear} />
            ) : (
              <SpotPanel
                area={area}
                nextArea={filteredAreas[(index + 1) % filteredAreas.length]}
                activeSpotId={hoveredSpotId}
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

        <div className="order-1 lg:absolute lg:inset-0">
          <AreaMap
            area={area}
            allAreas={areas}
            rightPanelOpen={!panelClosed}
            onSpotClick={setSelectedSpot}
            onSpotHover={hoverSpot}
          />
        </div>

        <SpotDetailDialog spot={selectedSpot} onClose={closeDetail} />
      </section>
    </div>
  );
}

/** 絞り込みで1件も当たらなかったときの情報パネル */
function NoMatchPanel({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5">
      <EmptyState
        icon={SearchX}
        title="条件に合う穴場が見つかりませんでした"
        description="キーワードを短くするか、カテゴリを減らしてみてください。"
        className="flex-1"
      />
      <Button variant="outline" onClick={onClear} className="self-center">
        条件をクリア
      </Button>
    </div>
  );
}
