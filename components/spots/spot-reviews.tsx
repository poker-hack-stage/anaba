"use client";

import { useEffect, useRef, useState } from "react";
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
  // 読み込みの世代。いちばん新しい読み込み（と書いたあとの読み直し）の結果だけを表示に使う。
  // 書く前に始まった読み込みが遅れて届いても、書いた口コミを古い一覧で上書きしないため
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = ++generationRef.current;
    let cancelled = false;
    const isLatest = () => !cancelled && generation === generationRef.current;
    const controller = new AbortController();
    // AbortSignal.any は Safari 17.3 以前にないので、時間切れは setTimeout で止める
    const timer = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
    (async () => {
      try {
        const res = await fetch(`/api/spots/${spotId}/reviews`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SpotReviews;
        if (isLatest()) setState({ status: "done", data });
      } catch {
        // 閉じた・別のスポットに替わった・あとから書いたときは、もう表示しないので何もしない
        if (isLatest()) setState({ status: "error" });
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [spotId, reloadCount]);

  const handlePosted = (review: PostedReview) => {
    setFormOpen(false);
    // 書く前に始まった読み込みの結果は捨てる
    const generation = ++generationRef.current;
    // 書いた口コミがすぐ見えるよう、先に一覧の先頭に足す。件数・平均は読み直して正しい値にする
    // （API は id・created_at を返さないので、仮の値を入れておく）
    setState((prev) => {
      const data =
        prev.status === "done"
          ? prev.data
          : { reviews: [], count: 0, average: null, sampleCount: 0 };
      const local: PublicReview = {
        ...review,
        id: `local-${Date.now()}`,
        created_at: new Date().toISOString(),
        is_sample: false,
      };
      return {
        status: "done",
        data: {
          reviews: [local, ...data.reviews],
          count: data.count + 1,
          average: data.average,
          sampleCount: data.sampleCount,
        },
      };
    });
    void refreshQuietly(spotId, (data) => {
      if (generation === generationRef.current) {
        setState({ status: "done", data });
      }
    });
  };

  return (
    <section
      aria-labelledby={`reviews-${spotId}`}
      className="flex flex-col gap-3 border-t border-stone-100 pt-4"
    >
      {/* スマホの幅で件数（「うちサンプルN件」）が長くなったら、見出しとボタンを折り返す */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3
          id={`reviews-${spotId}`}
          className="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-nowrap font-extrabold text-stone-900"
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
          <>
            <ul className="flex flex-col gap-2">
              {state.data.reviews.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </ul>
            {state.data.sampleCount > 0 && (
              <p className="text-pretty text-xs text-stone-500">
                「サンプル」の口コミは、表示の例として運営が書いたものです。実際に訪れた人の声ではありません。
              </p>
            )}
          </>
        ))}
    </section>
  );
}

/**
 * 「★4.2（3件）」。平均がない（口コミがない・書いた直後で読み直す前）ときは件数だけ。
 * サンプルの口コミ（#152）が入っていれば「（3件・うちサンプル2件）」にする
 */
function Summary({ data }: { data: SpotReviews }) {
  const countText =
    data.sampleCount > 0
      ? `（${data.count}件・うちサンプル${data.sampleCount}件）`
      : `（${data.count}件）`;
  if (data.average === null) {
    return (
      <span className="text-sm font-normal text-stone-500">{countText}</span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-sm font-normal text-stone-600">
      <Rating value={data.average} size="sm" showValue={false} />
      <span className="font-bold text-amber-700">
        {formatRating(data.average)}
      </span>
      {countText}
    </span>
  );
}

function ReviewItem({ review }: { review: PublicReview }) {
  return (
    <li className="rounded-xl bg-stone-50 p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
        <span className="font-bold text-stone-800">{review.nickname}</span>
        {review.is_sample && (
          <span className="rounded border border-stone-300 bg-white px-1.5 font-bold text-stone-600">
            サンプル
          </span>
        )}
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
