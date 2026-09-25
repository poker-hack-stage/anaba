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
 * PC は1行、狭い画面では折り返す。件数の変化は aria-live で読み上げる
 */
export function DiscoverSearch({
  text,
  onTextChange,
  onSubmit,
  inputFocusHandlers,
  categories,
  onToggleCategory,
  onClear,
  summary,
}: {
  text: string;
  onTextChange: (text: string) => void;
  /** Enter を押したとき（入力を待たずに反映する） */
  onSubmit: () => void;
  inputFocusHandlers: { onFocus: () => void; onBlur: () => void };
  categories: readonly SpotCategory[];
  onToggleCategory: (category: SpotCategory) => void;
  onClear: () => void;
  /** 絞り込み中の件数。条件がないときは null */
  summary: { areas: number; spots: number } | null;
}) {
  return (
    <div role="search" className="flex flex-wrap items-center gap-x-3 gap-y-3">
      <div className="relative w-full sm:w-72 lg:w-64">
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
          {...inputFocusHandlers}
          maxLength={MAX_QUERY_LENGTH}
          placeholder="スポット名・地域・タグで探す"
          aria-label="スポット名・地域・タグで探す"
          className="h-10 rounded-xl border-stone-200 bg-white pl-9"
        />
      </div>

      <div
        role="group"
        aria-label="カテゴリで絞り込む"
        className="flex flex-wrap gap-1.5"
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

      <div className="flex items-center gap-2 lg:ml-auto">
        {/* 空のときも置いておく（あとから中身が入ったときに読み上げられるように） */}
        <p aria-live="polite" className="text-sm font-semibold text-stone-700">
          {summary &&
            `${summary.areas}地域・${summary.spots}件が見つかりました`}
        </p>
        {summary && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-lg px-1 py-1 text-sm font-semibold text-stone-600 underline-offset-2 hover:text-stone-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden className="h-4 w-4" />
            条件をクリア
          </button>
        )}
      </div>
    </div>
  );
}
