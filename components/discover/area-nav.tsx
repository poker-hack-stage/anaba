import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AreaWithSpots } from "@/lib/data/areas";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const iconButton = cn(
  "flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100",
  focusRing,
);

/** 1行に出すドットの数の上限。情報パネルの幅（PC で 360px）に、前へ／次へと「3 / 12」を並べて収まる数 */
const MAX_DOTS = 7;

/**
 * 前へ／次へボタンと、今何番目かがわかるドット。
 * ドットの見た目は 8px（今の地域は横長）のまま、押せる範囲は 24×24px にする（WCAG 2.5.8、#120）。
 * ドットは1行に収める。地域が MAX_DOTS より多いときは、今の地域のまわりの MAX_DOTS 個だけを出し、
 * 横に「3 / 12」のように何番目かを出す（地域が増えても2行にならないように）。地域が1件以下なら何も出さない。
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

  // 出すドットの範囲。今の地域がなるべく真ん中に来るようにし、端では端に寄せる
  const windowed = areas.length > MAX_DOTS;
  const start = windowed
    ? Math.min(
        Math.max(index - Math.floor(MAX_DOTS / 2), 0),
        areas.length - MAX_DOTS,
      )
    : 0;
  const visible = areas
    .map((area, i) => ({ area, i }))
    .slice(start, start + MAX_DOTS);

  return (
    <div className="flex items-center">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onPrev}
          aria-label="前の地域"
          className={iconButton}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-nowrap justify-center">
          {visible.map(({ area: a, i }) => (
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
        {windowed && (
          // 何番目か（読み上げはドットの aria-current で伝わるので読まない）
          <span
            aria-hidden
            className="ml-1.5 text-xs tabular-nums text-stone-500"
          >
            {index + 1} / {areas.length}
          </span>
        )}
      </div>
    </div>
  );
}
