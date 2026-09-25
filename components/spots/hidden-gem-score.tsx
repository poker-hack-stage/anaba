import { Gem } from "lucide-react";
import type { HiddenGemScore as Score } from "@/lib/spots/score";
import { HIDDEN_GEM_SCORE_MAX } from "@/lib/spots/score";
import { cn } from "@/lib/utils";

// 大きさは Rating（components/ui/rating.tsx）とそろえる
const SIZES = {
  sm: { gem: "h-3 w-3", text: "text-xs" },
  md: { gem: "h-4 w-4", text: "text-sm" },
} as const;

/**
 * 穴場度の表示（読み取り専用）。1〜5 を宝石のアイコンの数で出す（docs/spec.md データ-3、docs/spot-scores.md）。
 * 絵文字（💎）ではなく lucide のアイコンにする。score が null（穴場度なし）のときは何も表示しない
 */
export function HiddenGemScore({
  score,
  size = "sm",
  className,
}: {
  score: Score | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (score === null) return null;

  const { gem, text } = SIZES[size];

  return (
    <span
      role="img"
      aria-label={`穴場度 ${HIDDEN_GEM_SCORE_MAX}段階中 ${score}`}
      className={cn(
        "inline-flex items-center gap-1 font-bold text-ink",
        text,
        className,
      )}
    >
      <span aria-hidden="true">穴場度</span>
      <span className="flex items-center gap-px" aria-hidden="true">
        {Array.from({ length: score }, (_, i) => (
          <Gem key={i} className={cn(gem, "fill-ink-light text-ink")} />
        ))}
      </span>
    </span>
  );
}
