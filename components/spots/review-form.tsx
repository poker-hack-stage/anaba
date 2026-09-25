"use client";

import { useId, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NETWORK_ERROR_MESSAGE,
  loadNickname,
  readApiError,
  saveNickname,
} from "@/lib/community/review-client";
import {
  LIMITS,
  countChars,
  reviewInputSchema,
  type ReviewInput,
} from "@/lib/community/schema";
import { cn } from "@/lib/utils";

/** 送信を待つ上限（ミリ秒）。応答がないまま送信中にし続けない */
const POST_TIMEOUT_MS = 15_000;

const STARS = [1, 2, 3, 4, 5] as const;

/** 書いた口コミ（API が返す正規化したあとの値。id・created_at は返らない） */
export type PostedReview = {
  spot_id: string;
  nickname: string;
  rating: number;
  body: string;
};

type Field = "nickname" | "rating" | "body";
type FieldErrors = Partial<Record<Field, string>>;

/**
 * 口コミを書くフォーム（#53）。送る前に API と同じスキーマ（lib/community/schema.ts）で確かめ、
 * 400 の欄ごとの理由は欄の下に、ほかのエラー（429 など）はフォームの上に出す
 */
export function ReviewForm({
  spotId,
  onPosted,
  onCancel,
}: {
  spotId: string;
  onPosted: (review: PostedReview) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [nickname, setNickname] = useState(loadNickname);
  const [rating, setRating] = useState<number | null>(null);
  const [body, setBody] = useState("");
  // おとりの欄。人は画面で見えないので触らない。ボットが埋めると、API は保存せずに成功を返す
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const remaining = LIMITS.body - countChars(body);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setFormError(null);

    const parsed = reviewInputSchema.safeParse({
      nickname,
      rating: rating ?? undefined,
      body,
      website,
    });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error.issues));
      return;
    }
    setFieldErrors({});

    setSending(true);
    try {
      const res = await fetch(`/api/spots/${spotId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data satisfies ReviewInput),
        signal: AbortSignal.timeout(POST_TIMEOUT_MS),
      });
      if (res.ok) {
        const { review } = (await res.json()) as { review: PostedReview };
        saveNickname(parsed.data.nickname);
        onPosted(review);
        return;
      }
      const error = await readApiError(res);
      setFormError(error.message);
      if (error.fields) setFieldErrors(toFieldErrors(error.fields));
    } catch {
      setFormError(NETWORK_ERROR_MESSAGE);
    } finally {
      setSending(false);
    }
  };

  const describedBy = (field: Field, extra?: string) =>
    [fieldErrors[field] && `${id}-${field}-error`, extra]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label="口コミを書く"
      className="flex flex-col gap-4 rounded-xl border border-stone-200 p-4"
    >
      <p className="text-xs text-stone-500">
        ログインは不要です。ニックネームと本文は公開されます。
      </p>

      {formError && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700"
        >
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-nickname`}>ニックネーム</Label>
        <Input
          id={`${id}-nickname`}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          autoComplete="nickname"
          aria-invalid={fieldErrors.nickname ? true : undefined}
          aria-describedby={describedBy("nickname", `${id}-nickname-hint`)}
        />
        <p id={`${id}-nickname-hint`} className="text-xs text-stone-500">
          {LIMITS.nickname}文字まで
        </p>
        <FieldError
          id={`${id}-nickname-error`}
          message={fieldErrors.nickname}
        />
      </div>

      <fieldset
        className="flex flex-col gap-1.5"
        aria-describedby={describedBy("rating")}
      >
        <legend className="mb-1.5 text-sm font-medium">星（必須）</legend>
        <div className="flex gap-1">
          {STARS.map((value) => (
            <label
              key={value}
              className="cursor-pointer rounded-md p-1 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name={`${id}-rating`}
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                className="sr-only"
                aria-label={`星${value}つ`}
              />
              <Star
                aria-hidden
                className={cn(
                  "h-7 w-7",
                  rating !== null && value <= rating
                    ? "fill-amber-500 text-amber-500"
                    : "fill-stone-200 text-stone-300",
                )}
              />
            </label>
          ))}
        </div>
        <FieldError id={`${id}-rating-error`} message={fieldErrors.rating} />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-body`}>口コミ</Label>
        <textarea
          id={`${id}-body`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          aria-invalid={fieldErrors.body ? true : undefined}
          aria-describedby={describedBy("body", `${id}-body-count`)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
        />
        <p
          id={`${id}-body-count`}
          className={cn(
            "text-right text-xs",
            remaining < 0 ? "font-bold text-red-700" : "text-stone-500",
          )}
        >
          {remaining < 0
            ? `${-remaining}文字多すぎます`
            : `残り${remaining}文字`}
        </p>
        <FieldError id={`${id}-body-error`} message={fieldErrors.body} />
      </div>

      {/* おとりの欄。見えない大きさにし（画面の外に置くとダイアログが横にスクロールするため sr-only）、読み上げとキーボードの移動からも外す */}
      <div aria-hidden className="sr-only">
        <label htmlFor={`${id}-website`}>ウェブサイト</label>
        <input
          id={`${id}-website`}
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          やめる
        </Button>
        <Button type="submit" disabled={sending}>
          {sending ? "送信中…" : "投稿する"}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs font-bold text-red-700">
      {message}
    </p>
  );
}

/** スキーマの問題（issues）か API の fields から、欄ごとの最初の理由を取り出す */
function toFieldErrors(
  source: { path: PropertyKey[]; message: string }[] | Record<string, string>,
): FieldErrors {
  const entries = Array.isArray(source)
    ? source.map((issue) => [String(issue.path[0]), issue.message] as const)
    : Object.entries(source);
  const errors: FieldErrors = {};
  for (const [key, message] of entries) {
    if (
      (key === "nickname" || key === "rating" || key === "body") &&
      !errors[key]
    ) {
      errors[key] = message;
    }
  }
  return errors;
}
