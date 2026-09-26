import { Clock } from "lucide-react";
import { Rating } from "@/components/ui/rating";
import type { Spot } from "@/lib/data/spots";
import { getHiddenGemScore, getRating } from "@/lib/spots/score";
import { CategoryBadge } from "./category-badge";
import { HiddenGemScore } from "./hidden-gem-score";
import { SpotImage, preloadSpotImage } from "./spot-image";

/** カードの写真の表示幅（h-24 w-24）。next/image の sizes と先読みで同じ値を使う */
const CARD_IMAGE_SIZES = "96px";

/** カードの写真を先に読み込んでおく（次の地域の3件など） */
export function preloadSpotCardImages(spots: Pick<Spot, "image_path">[]) {
  for (const spot of spots) preloadSpotImage(spot.image_path, CARD_IMAGE_SIZES);
}

/**
 * 情報パネルに並べるスポットカード（写真・カテゴリ・名前・評価・穴場度・キャッチコピー・タグ）。クリックで詳細を開く。
 * 口コミの件数・平均はカードには出さない（詳細の口コミ欄だけ、#53）
 */
export function SpotCard({
  spot,
  onSelect,
}: {
  spot: Spot;
  onSelect?: (spot: Spot) => void;
}) {
  const rating = getRating(spot);
  const hiddenGemScore = getHiddenGemScore(spot);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(spot)}
      className="flex w-full gap-3 overflow-hidden rounded-2xl border border-stone-200 bg-white p-3 text-left transition-colors hover:border-stone-300 hover:bg-stone-50"
    >
      <SpotImage
        category={spot.category}
        imagePath={spot.image_path}
        sizes={CARD_IMAGE_SIZES}
        className="h-24 w-24 shrink-0 rounded-xl"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <CategoryBadge category={spot.category} />
        <h3 className="truncate font-extrabold text-stone-900">{spot.name}</h3>
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
