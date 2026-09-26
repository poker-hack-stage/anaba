"use client";

import { useState, type RefObject } from "react";
import { Search, X } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { CATEGORIES, type SpotCategory } from "@/lib/spots/categories";
import { MAX_QUERY_LENGTH } from "@/lib/spots/filter";

const CATEGORY_ENTRIES = Object.entries(CATEGORIES) as [
  SpotCategory,
  (typeof CATEGORIES)[SpotCategory],
][];

/**
 * 「穴場を探す」の検索欄・カテゴリのチップ・件数と「条件をクリア」（docs/spec.md 画面-3）。
 * タブレット（sm〜lg 未満）は1行（入りきらなければ折り返す）、PC（lg 以上）は地図の上の左のパネルに縦に並べる。
 * 件数の変化は aria-live で読み上げる。
 * スマホ（sm 未満）では検索欄だけを見せ、検索欄を押したらカテゴリのチップを出す。
 * フォーカスが検索欄とチップの外へ出たら閉じる。ただしカテゴリを選んでいる間は閉じない（どの条件で絞っているかが見えなくなるため、#120）。
 * 検索欄とチップは背景でひとまとまりに見せる（kosei の判断）
 */
export function DiscoverSearch({
  text,
  onTextChange,
  onSubmit,
  inputProps,
  categories,
  onToggleCategory,
  onClear,
  summary,
}: {
  text: string;
  onTextChange: (text: string) => void;
  /** Enter を押したとき（入力を待たずに反映する） */
  onSubmit: () => void;
  /** 検索欄に渡す ref とイベント（フォーカス・IME の変換） */
  inputProps: {
    ref: RefObject<HTMLInputElement | null>;
    onFocus: () => void;
    onBlur: () => void;
    onCompositionStart: () => void;
    onCompositionEnd: () => void;
  };
  categories: readonly SpotCategory[];
  onToggleCategory: (category: SpotCategory) => void;
  onClear: () => void;
  /** 絞り込み中の件数。条件がないときは null */
  summary: { areas: number; spots: number } | null;
}) {
  // スマホで検索欄かチップにフォーカスがあるか。チップはこのときとカテゴリを選んでいる間に出す（PC では常に出す）
  const [focusWithin, setFocusWithin] = useState(false);
  const chipsOpen = focusWithin || categories.length > 0;

  return (
    <div
      role="search"
      className="flex flex-wrap items-center gap-x-3 gap-y-3 lg:flex-col lg:flex-nowrap lg:items-stretch"
    >
      {/* スマホでは検索欄とチップを背景でひとまとまりにする。sm 以上では contents で枠をなくし、今までどおり1行に並べる */}
      <div
        className={`flex w-full flex-col rounded-2xl transition-all duration-200 ease-out motion-reduce:transition-none sm:contents ${chipsOpen ? "gap-2 bg-ink-light p-2" : "gap-0 bg-transparent p-0"}`}
        onFocus={() => setFocusWithin(true)}
        onBlur={(e) => {
          // フォーカスが検索欄とチップの外へ出たときだけ閉じる
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setFocusWithin(false);
          }
        }}
      >
        <div className="relative w-full sm:w-72 lg:w-full">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
          />
          <Input
            type="search"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) onSubmit();
            }}
            {...inputProps}
            maxLength={MAX_QUERY_LENGTH}
            placeholder="スポット名・地域・タグで探す"
            aria-label="スポット名・地域・タグで探す"
            className="h-10 rounded-xl border-stone-200 bg-white pl-9"
          />
        </div>

        {/* スマホでは高さ（grid の 0fr ↔ 1fr）と透明度でふわっと開閉する。閉じている間は invisible でフォーカスもしない */}
        <div
          className={`grid transition-[grid-template-rows,opacity,visibility] duration-200 ease-out motion-reduce:transition-none sm:contents ${chipsOpen ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0 sm:visible"}`}
        >
          <div
            role="group"
            aria-label="カテゴリで絞り込む"
            className="flex min-h-0 flex-wrap gap-1.5 overflow-hidden sm:overflow-visible"
            // チップを押してもフォーカスを検索欄から動かさない（スマホでタップしたとき閉じないように）
            onMouseDown={(e) => e.preventDefault()}
          >
            {CATEGORY_ENTRIES.map(([key, { label, icon: Icon }]) => (
              <Chip
                key={key}
                active={categories.includes(key)}
                onClick={() => onToggleCategory(key)}
                className="inline-flex items-center gap-1 lg:px-2.5"
              >
                <Icon aria-hidden className="h-3.5 w-3.5" />
                {label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:flex-wrap">
        {/* 空のときも置いておく（あとから中身が入ったときに読み上げられるように） */}
        <p aria-live="polite" className="text-sm font-semibold text-stone-700">
          {summary &&
            (summary.spots === 0
              ? "条件に合う穴場はありません"
              : `${summary.areas}地域・${summary.spots}件が見つかりました`)}
        </p>
        {summary && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-1 py-1 text-sm font-semibold text-stone-600 underline-offset-2 hover:text-stone-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden className="h-4 w-4" />
            条件をクリア
          </button>
        )}
      </div>
    </div>
  );
}
