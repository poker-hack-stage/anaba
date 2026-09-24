import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { star: "h-3 w-3", text: "text-xs" },
  md: { star: "h-4 w-4", text: "text-sm" },
} as const;

/**
 * 星評価の表示（読み取り専用）。spots.rating（0〜5、小数第1位まで）を星の数と数値で出す。
 * 星は小数ぶんだけ途中まで塗る。rating が null（評価なし）のときは何も表示しない
 */
export function Rating({
  value,
  max = 5,
  size = "sm",
  showValue = true,
  className,
}: {
  value: number | null;
  max?: number;
  size?: keyof typeof SIZES;
  /** false にすると星だけを出す（数値は読み上げ用のラベルにだけ入る） */
  showValue?: boolean;
  className?: string;
}) {
  if (value === null) return null;

  const clamped = Math.min(Math.max(value, 0), max);
  const label = clamped.toFixed(1);
  const { star, text } = SIZES[size];

  return (
    <span
      role="img"
      aria-label={`${max}段階中 ${label}`}
      className={cn("inline-flex items-center gap-1", className)}
    >
      <span className="flex items-center gap-px" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => {
          // この星を塗る割合（0〜100%）
          const fill = Math.min(Math.max(clamped - i, 0), 1) * 100;
          return (
            <span key={i} className="relative inline-flex">
              <Star className={cn(star, "fill-stone-200 text-stone-200")} />
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill}%` }}
              >
                <Star
                  className={cn(star, "shrink-0 fill-amber-500 text-amber-500")}
                />
              </span>
            </span>
          );
        })}
      </span>
      {showValue && (
        // amber-600 は白地で 3.2:1 しかないため、文字は amber-700（5.0:1）にする
        <span
          className={cn(text, "font-bold text-amber-700")}
          aria-hidden="true"
        >
          {label}
        </span>
      )}
    </span>
  );
}
