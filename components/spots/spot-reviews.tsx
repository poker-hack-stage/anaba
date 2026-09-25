"use client";

import { useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Rating } from "@/components/ui/rating";
import { Skeleton } from "@/components/ui/skeleton";
import type { PublicReview, SpotReviews } from "@/lib/community/reviews";
import { formatReviewDate } from "@/lib/community/review-client";
import { formatRating } from "@/lib/spots/score";
import { ReviewForm, type PostedReview } from "./review-form";

/** 一覧の読み込みを待つ上限（ミリ秒）。応答がないまま読み込み中にし続けない */
const LOAD_TIMEOUT_MS = 15_000;

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; data: SpotReviews };

/**
 * スポット詳細の口コミ欄（#53）。開いたときに GET /api/spots/[id]/reviews を読む。
 * 評価の表示は #56 の方針: 詳細の上の星はシードの評価のまま、口コミの平均と件数はここに別に出す。
 * スポットごとに状態を持つので、呼ぶ側は key にスポットの id を渡す
 */
export function SpotReviewsSection({ spotId }: { spotId: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [formOpen, setFormOpen] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(LOAD_TIMEOUT_MS),
    ]);
    (async () => {
      try {
        const res = await fetch(`/api/spots/${spotId}/reviews`, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SpotReviews;
        setState({ status: "done", data });
      } catch {
        // 閉じた・別のスポットに替わったときは、もう表示しないので何もしない
        if (!controller.signal.aborted) setState({ status: "error" });
      }
    })();
    return () => controller.abort();
  }, [spotId, reloadCount]);

  const handlePosted = (review: PostedReview) => {
    setFormOpen(false);
    // 書いた口コミがすぐ見えるよう、先に一覧の先頭に足す。件数・平均は読み直して正しい値にする
    // （API は id・created_at を返さないので、仮の値を入れておく）
    setState((prev) => {
      const data =
        prev.status === "done"
          ? prev.data
          : { reviews: [], count: 0, average: null };
      const local: PublicReview = {
        ...review,
        id: `local-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      return {
        status: "done",
        data: {
          reviews: [local, ...data.reviews],
          count: data.count + 1,
          average: data.average,
        },
      };
    });
    void refreshQuietly(spotId, (data) => setState({ status: "done", data }));
  };

  return (
    <section
      aria-labelledby={`reviews-${spotId}`}
      className="flex flex-col gap-3 border-t border-stone-100 pt-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          id={`reviews-${spotId}`}
          className="flex items-center gap-2 font-extrabold text-stone-900"
        >
          口コミ
          {state.status === "done" && <Summary data={state.data} />}
        </h3>
        {!formOpen && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFormOpen(true)}
          >
            <MessageSquarePlus aria-hidden />
            口コミを書く
          </Button>
        )}
      </div>

      {formOpen && (
        <ReviewForm
          spotId={spotId}
          onPosted={handlePosted}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {state.status === "loading" && (
        <div role="status" aria-label="口コミを読み込んでいます">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="mt-2 h-16 w-full" />
        </div>
      )}

      {state.status === "error" && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-600">
          <p role="alert">口コミを読み込めませんでした</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setState({ status: "loading" });
              setReloadCount((n) => n + 1);
            }}
          >
            もう一度読み込む
          </Button>
        </div>
      )}

      {state.status === "done" &&
        (state.data.reviews.length === 0 ? (
          <p className="text-sm text-stone-500">
            まだ口コミはありません。最初の口コミを書いてみませんか。
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {state.data.reviews.map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </ul>
        ))}
    </section>
  );
}

/** 「★4.2（3件）」。平均がない（口コミがない・書いた直後で読み直す前）ときは件数だけ */
function Summary({ data }: { data: SpotReviews }) {
  if (data.average === null) {
    return (
      <span className="text-sm font-normal text-stone-500">
        （{data.count}件）
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-sm font-normal text-stone-600">
      <Rating value={data.average} size="sm" showValue={false} />
      <span className="font-bold text-amber-700">
        {formatRating(data.average)}
      </span>
      （{data.count}件）
    </span>
  );
}

function ReviewItem({ review }: { review: PublicReview }) {
  return (
    <li className="rounded-xl bg-stone-50 p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
        <span className="font-bold text-stone-800">{review.nickname}</span>
        <Rating value={review.rating} size="sm" />
        <time dateTime={review.created_at} className="ml-auto">
          {formatReviewDate(review.created_at)}
        </time>
      </div>
      {/* 本文はテキストとして出す（HTML として読まない）。改行はそのまま見せる */}
      <p className="mt-1 whitespace-pre-line break-words text-sm text-stone-700">
        {review.body}
      </p>
    </li>
  );
}

/** 書いたあとに一覧を読み直す。失敗しても、先に足した口コミが見えているので知らせない */
async function refreshQuietly(
  spotId: string,
  onLoaded: (data: SpotReviews) => void,
) {
  try {
    const res = await fetch(`/api/spots/${spotId}/reviews`, {
      signal: AbortSignal.timeout(LOAD_TIMEOUT_MS),
    });
    if (res.ok) onLoaded((await res.json()) as SpotReviews);
  } catch {
    // 何もしない
  }
}
