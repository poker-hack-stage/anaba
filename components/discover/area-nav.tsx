import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AreaWithSpots } from "@/lib/data/areas";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const iconButton = cn(
  "flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100",
  focusRing,
);

/**
 * 前へ／次へボタンと、今何番目かがわかるドット。
 * ドットの見た目は 8px（今の地域は横長）のまま、押せる範囲は 24×24px にする（WCAG 2.5.8、#120）。
 * 並びきらないときはドットを折り返す。地域が1件以下なら何も出さない。
 */
export function AreaNav({
  areas,
  index,
  onPrev,
  onNext,
  onSelect,
}: {
  areas: AreaWithSpots[];
  index: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
}) {
  if (areas.length < 2) return null;

  return (
    <div className="mt-auto flex items-center justify-center pt-2">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onPrev}
          aria-label="前の地域"
          className={iconButton}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-wrap justify-center">
          {areas.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={a.name}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "flex h-6 min-w-6 items-center justify-center rounded-full",
                focusRing,
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "h-2 rounded-full transition-all motion-reduce:transition-none",
                  i === index ? "w-6 bg-ink" : "w-2 bg-stone-300",
                )}
              />
            </button>
          ))}
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
    </div>
  );
}
