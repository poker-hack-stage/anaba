import { Clock } from "lucide-react";
import { Rating } from "@/components/ui/rating";
import type { Spot } from "@/lib/data/spots";
import { getHiddenGemScore, getRating } from "@/lib/spots/score";
import { cn } from "@/lib/utils";
import { CategoryBadge } from "./category-badge";
import { HiddenGemScore } from "./hidden-gem-score";
import { SpotImage, preloadSpotImage } from "./spot-image";

/**
 * カードの写真の表示幅。next/image の sizes と先読みで同じ値を使う。
 * - default: h-24 w-24
 * - panel: 「穴場を探す」の情報パネル。PC（lg 以上）はカードの幅いっぱい
 *   （パネルの幅 360px / 420px から、パネルとカードの余白と枠線を引いた値。area-rotator.tsx）
 */
const CARD_IMAGE_SIZES = {
  default: "96px",
  panel: "(min-width: 1280px) 354px, (min-width: 1024px) 294px, 96px",
} as const;

export type SpotCardVariant = keyof typeof CARD_IMAGE_SIZES;

/** カードの写真を先に読み込んでおく（次の地域の3件など）。`variant` は表示するカードと同じにする */
export function preloadSpotCardImages(
  spots: Pick<Spot, "image_path">[],
  variant: SpotCardVariant = "default",
) {
  for (const spot of spots) {
    preloadSpotImage(spot.image_path, CARD_IMAGE_SIZES[variant]);
  }
}

/**
 * 情報パネルに並べるスポットカード（写真・カテゴリ・名前・評価・穴場度・キャッチコピー・タグ）。クリックで詳細を開く。
 * 口コミの件数・平均はカードには出さない（詳細の口コミ欄だけ、#53）。
 * `variant="panel"` は PC（lg 以上）で写真を上に大きく出し、その下に文字を並べる
 */
export function SpotCard({
  spot,
  onSelect,
  variant = "default",
}: {
  spot: Spot;
  onSelect?: (spot: Spot) => void;
  variant?: SpotCardVariant;
}) {
  const panel = variant === "panel";
  const rating = getRating(spot);
  const hiddenGemScore = getHiddenGemScore(spot);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(spot)}
      className={cn(
        "flex w-full gap-3 overflow-hidden rounded-2xl border border-stone-200 bg-white p-3 text-left transition-colors hover:border-stone-300 hover:bg-stone-50",
        panel && "lg:flex-col",
      )}
    >
      <SpotImage
        category={spot.category}
        imagePath={spot.image_path}
        sizes={CARD_IMAGE_SIZES[variant]}
        className={cn(
          "h-24 w-24 shrink-0 rounded-xl",
          panel && "lg:aspect-[16/10] lg:h-auto lg:w-full",
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <CategoryBadge category={spot.category} />
        <h3
          className={cn(
            "truncate font-extrabold text-stone-900",
            panel && "lg:text-lg",
          )}
        >
          {spot.name}
        </h3>
        {(rating !== null || hiddenGemScore !== null) && (
          // 狭い幅では穴場度の数でカードごとに折り返しがばらつくので、最初から2行にする
          <div className="flex flex-col items-start gap-y-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
            <Rating value={rating} />
            <HiddenGemScore score={hiddenGemScore} />
          </div>
        )}
        {spot.catchphrase && (
          <p className="line-clamp-2 text-xs leading-relaxed text-stone-600">
            {spot.catchphrase}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
          {spot.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600"
            >
              #{tag}
            </span>
          ))}
          {spot.best_time && (
            <span className="ml-auto flex items-center gap-0.5 text-[10px] text-stone-500">
              <Clock className="h-3 w-3" />
              {spot.best_time}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function SpotCardSkeleton() {
  return (
    // 高さはカードの実測に合わせて幅で分ける。スマホは評価・穴場度が2行になり 204〜242px
    // （375px の中央値 242px・414px の中央値 204px の間を取る）、sm〜lg は1列で約 146px、lg 以上は約 184px
    <div className="h-[228px] animate-pulse rounded-2xl bg-stone-200/60 sm:h-[146px] lg:h-[184px]" />
  );
}
