"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import type { Spot } from "@/lib/data/spots";
import type { PlanCandidate } from "@/lib/planner/types";
import { cn } from "@/lib/utils";
import { CandidateCard } from "./candidate-card";

/**
 * カードの地図を、一覧で並べていたときより高くする（候補を1件ずつ大きく見せるため、#80）。
 * 包む要素から、カードの先頭の子（地図。読み込み中は SpotMapSkeleton）の高さを上書きする。
 * カードの先頭の子が地図でなくなると黙って効かなくなる（jsdom では CSS が効かず、テストでも気づけない）
 */
// TODO(#78): 地図を MapLibre に替えたら、CandidateCard に地図の className の props（mapClassName）を足し、この上書きを置き換える
const LARGE_MAP_CLASS_NAME =
  "[&>article>:first-child]:h-72 sm:[&>article>:first-child]:h-96 lg:[&>article>:first-child]:h-[28rem]";

/**
 * 旅プランの候補を、タブで1件ずつ切り替えて見せる（WAI-ARIA の tabs。←→・Home・End で移動する）。
 * 描くのは選んだ候補のカードだけ。候補が1件ならタブは出さない。
 * 選んでいる番号は持たずに受け取る（画面を移って戻っても残るよう、PlannerStateProvider に持つ）
 */
export function CandidateTabs({
  candidates,
  selectedIndex,
  onSelect,
  onSpotClick,
}: {
  candidates: PlanCandidate[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onSpotClick: (spot: Spot) => void;
}) {
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 候補が減っても範囲外を読まないよう、件数で丸める
  const index = Math.min(selectedIndex, candidates.length - 1);
  const candidate = candidates[index];
  if (!candidate) return null;

  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = `${baseId}-panel`;
  const card = (
    <div className={LARGE_MAP_CLASS_NAME}>
      {/* key を候補ごとに変え、切り替えるたびに地図を作り直す */}
      <CandidateCard
        key={candidate.id}
        candidate={candidate}
        onSpotClick={onSpotClick}
      />
    </div>
  );

  if (candidates.length === 1) return card;

  const select = (i: number) => {
    onSelect(i);
    tabRefs.current[i]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = candidates.length - 1;
    const next = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="旅の候補"
        onKeyDown={onKeyDown}
        className="flex gap-1 rounded-2xl border border-stone-200 bg-white p-1"
      >
        {candidates.map((c, i) => {
          const selected = i === index;
          return (
            <button
              key={c.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={tabId(i)}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(i)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center rounded-xl px-2 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                selected
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100",
              )}
            >
              {/* 画面には町の名前だけを出す（kosei の判断）。読み上げでは何番目の候補かを伝える */}
              <span className="sr-only">候補{i + 1}：</span>
              <span className="w-full truncate text-sm font-extrabold">
                {c.areaName}
              </span>
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId(index)}
        tabIndex={0}
        className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {card}
      </div>
    </div>
  );
}
