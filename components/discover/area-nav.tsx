import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AreaWithSpots } from "@/lib/data/areas";
import { cn } from "@/lib/utils";

/** 前へ／次へボタンと、今何番目かがわかるドット。地域が1件以下なら何も出さない。 */
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
    <div className="mt-auto flex items-center justify-between pt-2">
      <button
        type="button"
        onClick={onPrev}
        aria-label="前の地域"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="flex gap-1.5">
        {areas.map((a, i) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={a.name}
            className={cn(
              "h-2 rounded-full transition-all",
              i === index ? "w-6 bg-ink" : "w-2 bg-stone-300",
            )}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onNext}
        aria-label="次の地域"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
