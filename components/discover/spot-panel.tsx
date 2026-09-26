"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, MapPinned } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SpotCard, preloadSpotCardImages } from "@/components/spots/spot-card";
import type { AreaWithSpots } from "@/lib/data/areas";
import type { Spot } from "@/lib/data/spots";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/**
 * 情報パネル。ピックアップ中の地域の見出しと、おすすめ3件のスポットを並べる。
 * `nav`（前へ／次へ・ドット）は、パネルのいちばん上に置く。
 * 最初の画面で見えるように（A-13）、またカードから離して、スポットを切り替えるボタンと間違えないようにする。
 * カードの上には「おすすめのN か所」の見出しを置き、地域の説明とカードを区切る。
 * カードは PC（lg 以上）で写真をカードの幅いっぱいに大きく出す（`variant="panel"`）。
 * `activeSpotId` のカード（地図でピンにマウスが乗っているスポット）を枠で強調する。
 * `nextArea`（次に切り替わる地域）のおすすめ3件の写真は先に読んでおき、切り替えたときに写真の枠が空かないようにする。
 *
 * スマホ・タブレット（lg 未満）では地図の下端に浮かべるので（#142）、余白を詰め、カードを横スクロールで1枚ずつ見せる。
 * CSS の scroll-snap で1枚ずつ止め、カードの幅を狭くして次のカードの端を見せる。
 * スクロールで見えているカードの番号を `onCardIndexChange` で知らせ（地図のピンを目立たせるのに使う）、
 * 見出しの横に今のカードの点と前／次のボタンを出す（キーボード・読み上げでも動かせるように）。
 * PC では点とボタンを出さず、今までどおり縦に並べる。
 */
export function SpotPanel({
  area,
  nextArea,
  activeSpotId,
  cardIndex = 0,
  onCardIndexChange,
  onSelectSpot,
  nav,
}: {
  area?: AreaWithSpots;
  nextArea?: AreaWithSpots;
  activeSpotId?: string | null;
  /** スマホで見えているカードの番号（0から） */
  cardIndex?: number;
  /** スマホで、スクロール・点・前／次のボタンで見えるカードが変わったとき */
  onCardIndexChange?: (index: number) => void;
  onSelectSpot: (spot: Spot) => void;
  nav?: ReactNode;
}) {
  useEffect(() => {
    if (nextArea) preloadSpotCardImages(nextArea.recommended, "panel");
  }, [nextArea]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 max-lg:gap-2 max-lg:bg-white/95 max-lg:p-3 max-lg:backdrop-blur-sm">
      {/* いちばん上に、地域を切り替えるボタン（nav）だけを置く。
          カードのすぐ上に置くと、スポットを切り替えるボタンと間違えやすいため */}
      {nav}

      <div
        key={`heading-${area?.id}`}
        className="animate-in fade-in slide-in-from-right-4"
      >
        {/* スマホでは地図を広く見せるため、見出しの前の「ピックアップ中の地域」は読み上げだけにする */}
        <p className="text-xs font-bold text-shu max-lg:sr-only">
          ピックアップ中の地域
        </p>
        <h2 className="font-brand text-xl font-bold text-ink max-lg:text-lg max-lg:leading-snug">
          {area?.name ?? "地域はまだありません"}
        </h2>
        {area?.catchphrase && (
          <p className="mt-1 text-sm text-stone-600 max-lg:mt-0 max-lg:line-clamp-1 max-lg:text-xs">
            {area.catchphrase}
          </p>
        )}
      </div>

      {!area || area.recommended.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="スポットはまだありません"
          description="地域とスポットが登録されると、ここにおすすめの3か所が表示されます。"
          className="flex-1 max-lg:py-4"
        />
      ) : (
        <SpotCarousel
          // 地域が変わったら作り直し、最初のカードから見せる
          key={`spots-${area.id}`}
          spots={area.recommended}
          activeSpotId={activeSpotId}
          cardIndex={cardIndex}
          onCardIndexChange={onCardIndexChange}
          onSelectSpot={onSelectSpot}
        />
      )}
    </div>
  );
}

/**
 * おすすめのカードの並び。PC は縦、スマホ・タブレットは横スクロール（scroll-snap で1枚ずつ止める）。
 * 見えているカードは、スクロールの位置からいちばん近いカードとする（右端まで送ったときは最後のカード）
 */
function SpotCarousel({
  spots,
  activeSpotId,
  cardIndex,
  onCardIndexChange,
  onSelectSpot,
}: {
  spots: Spot[];
  activeSpotId?: string | null;
  cardIndex: number;
  onCardIndexChange?: (index: number) => void;
  onSelectSpot: (spot: Spot) => void;
}) {
  const headingId = useId();
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const frame = useRef<number | null>(null);
  const current = Math.min(cardIndex, spots.length - 1);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  // スクロールのたびに見えているカードを求める（1フレームに1回）
  const handleScroll = () => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const list = listRef.current;
      if (!list) return;
      const items = Array.from(list.children) as HTMLElement[];
      const start = list.scrollLeft;
      const atEnd = start + list.clientWidth >= list.scrollWidth - 1;
      let index = items.length - 1;
      if (!atEnd) {
        const first = items[0]?.offsetLeft ?? 0;
        let best = Infinity;
        items.forEach((item, i) => {
          const distance = Math.abs(item.offsetLeft - first - start);
          if (distance < best) {
            best = distance;
            index = i;
          }
        });
      }
      if (index !== current) onCardIndexChange?.(index);
    });
  };

  // 点・前／次のボタンで i 枚目のカードへ送る。見えるカードはスクロールで決まるが、先に知らせて点をすぐ動かす
  const scrollToCard = (i: number) => {
    const list = listRef.current;
    const item = list?.children[i] as HTMLElement | undefined;
    const first = list?.children[0] as HTMLElement | undefined;
    if (list && item && first) {
      const reduced = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      list.scrollTo?.({
        left: item.offsetLeft - first.offsetLeft,
        behavior: reduced ? "auto" : "smooth",
      });
    }
    onCardIndexChange?.(i);
  };

  const multiple = spots.length > 1;
  const arrowButton = cn(
    "flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-white",
    focusRing,
  );

  return (
    <div className="flex flex-col gap-2 border-t border-stone-200 pt-4 max-lg:border-t-0 max-lg:pt-0">
      <div className="flex items-center justify-between gap-2">
        <p id={headingId} className="text-xs font-bold text-stone-600">
          おすすめの{spots.length}か所
        </p>
        {/* 今のカードの点と前／次のボタン（スマホ・タブレットだけ）。
            端では押せないことを aria-disabled で伝える（disabled にするとフォーカスが外れるため） */}
        {multiple && (
          <div className="flex items-center gap-1 lg:hidden">
            <div className="flex items-center">
              {spots.map((spot, i) => (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => scrollToCard(i)}
                  aria-controls={listId}
                  aria-label={`${i + 1}件目: ${spot.name}`}
                  aria-current={i === current ? "true" : undefined}
                  // 見た目は 6px の点、押せる範囲は 24×24px（WCAG 2.5.8）
                  className={cn(
                    "flex h-6 min-w-6 items-center justify-center rounded-full",
                    focusRing,
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-1.5 rounded-full transition-all motion-reduce:transition-none",
                      i === current ? "w-4 bg-ink" : "w-1.5 bg-stone-300",
                    )}
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => current > 0 && scrollToCard(current - 1)}
              aria-controls={listId}
              aria-disabled={current === 0}
              aria-label="前のおすすめ"
              className={arrowButton}
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                current < spots.length - 1 && scrollToCard(current + 1)
              }
              aria-controls={listId}
              aria-disabled={current === spots.length - 1}
              aria-label="次のおすすめ"
              className={arrowButton}
            >
              <ChevronRight aria-hidden className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      {/* スマホ・タブレットでは横に並べ、パネルの余白（px-3）まで広げてスクロールさせる。
          カードの幅を 85% にして、次のカードの端を見せる。スクロールバーは点で代わりになるので出さない */}
      <ul
        ref={listRef}
        id={listId}
        aria-labelledby={headingId}
        onScroll={handleScroll}
        className="flex flex-col gap-3 animate-in fade-in max-lg:-mx-3 max-lg:snap-x max-lg:snap-mandatory max-lg:scroll-px-3 max-lg:flex-row max-lg:gap-2 max-lg:overflow-x-auto max-lg:overscroll-x-contain max-lg:px-3 max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden"
      >
        {spots.map((spot) => (
          <li
            key={spot.id}
            data-active={spot.id === activeSpotId || undefined}
            className={cn(
              "rounded-2xl transition-shadow data-[active]:ring-2 data-[active]:ring-ink data-[active]:ring-offset-2",
              "max-lg:w-[85%] max-lg:shrink-0 max-lg:snap-start max-lg:snap-always",
              !multiple && "max-lg:w-full",
            )}
          >
            <SpotCard spot={spot} onSelect={onSelectSpot} variant="panel" />
          </li>
        ))}
      </ul>
    </div>
  );
}
