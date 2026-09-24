import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { AreaWithSpots } from "@/lib/data/areas";
import { cn } from "@/lib/utils";

const iconButton =
  "flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100";

/**
 * 前へ／次へボタン、今何番目かがわかるドット、自動切り替えの一時停止／再生ボタン。
 * 地域が1件以下なら何も出さない。
 */
export function AreaNav({
  areas,
  index,
  onPrev,
  onNext,
  onSelect,
  paused,
  onTogglePause,
}: {
  areas: AreaWithSpots[];
  index: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
  paused: boolean;
  onTogglePause: () => void;
}) {
  if (areas.length < 2) return null;

  return (
    <div className="mt-auto flex items-center justify-between pt-2">
      <button
        type="button"
        onClick={onPrev}
        aria-label="前の地域"
        className={iconButton}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-3">
        {/* タッチ端末ではマウスを乗せて止められないので、止める手段をボタンで用意する（WCAG 2.2.2） */}
        <button
          type="button"
          onClick={onTogglePause}
          aria-label={paused ? "自動切り替えを再開" : "自動切り替えを一時停止"}
          className={iconButton}
        >
          {paused ? (
            <Play className="h-4 w-4" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
        </button>
        <div className="flex gap-1.5">
          {areas.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={a.name}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "h-2 rounded-full transition-all motion-reduce:transition-none",
                i === index ? "w-6 bg-ink" : "w-2 bg-stone-300",
              )}
            />
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={onNext}
        aria-label="次の地域"
        className={iconButton}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
