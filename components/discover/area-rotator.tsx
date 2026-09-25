"use client";

import { useCallback, useMemo, useState } from "react";
import { SearchX } from "lucide-react";
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

/**
 * 「穴場を探す」のメイン部分。
 * 地図で1つの地域とおすすめ3件をハイライトし、情報パネルにその3件を出す。数秒ごとに次の地域へ切り替わる。
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

  // 条件が変わったら、一致した最初の地域から巡回し直す。
  // キーワードは絞り込みと同じ正規化をしてから比べる（前後の空白だけ変わっても戻さないように）
  const filterKey = `${parseKeywords(filter.q).join(" ")}|${filter.categories.join(",")}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    goTo(0);
  }

  const area = filteredAreas[index];
  const closeDetail = useCallback(() => setSelectedSpot(null), []);

  return (
    <div className="flex flex-col gap-4">
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

      <section
        className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_400px]"
        {...hoverHandlers}
        {...focusHandlers}
      >
        <AreaMap area={area} onSpotClick={setSelectedSpot} />

        {filtering && !area ? (
          <NoMatchPanel onClear={search.clear} />
        ) : (
          <SpotPanel
            area={area}
            nextArea={filteredAreas[(index + 1) % filteredAreas.length]}
            onSelectSpot={setSelectedSpot}
            footer={
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
