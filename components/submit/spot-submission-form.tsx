"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPinned } from "lucide-react";
import { SpotMapSkeleton } from "@/components/map/spot-map-skeleton";
import type { MapPoint } from "@/components/map/spot-map";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AreaSelect } from "@/components/ui/area-select";
import {
  NETWORK_ERROR_MESSAGE,
  loadNickname,
  readApiError,
  saveNickname,
} from "@/lib/community/review-client";
import {
  LIMITS,
  countChars,
  spotSubmissionInputSchema,
  type SpotSubmissionInput,
} from "@/lib/community/schema";
import type { Area } from "@/lib/data/areas";
import { CATEGORIES, type SpotCategory } from "@/lib/spots/categories";
import { cn } from "@/lib/utils";
import { areaRange } from "./area-range";

const MAP_CLASS_NAME = "h-64 sm:h-72";

// 地図（MapLibre）は window と WebGL を使うので、サーバーでは描画しない
const SpotMap = dynamic(
  () => import("@/components/map/spot-map").then((m) => m.SpotMap),
  { ssr: false, loading: () => <SpotMapSkeleton className={MAP_CLASS_NAME} /> },
);

/** 送信を待つ上限（ミリ秒）。応答がないまま送信中にし続けない */
const POST_TIMEOUT_MS = 15_000;

const CATEGORY_ENTRIES = Object.entries(CATEGORIES) as [
  SpotCategory,
  (typeof CATEGORIES)[SpotCategory],
][];

/** 投稿できる地域（フォームで使う列だけ） */
export type SubmittableArea = Pick<
  Area,
  "id" | "name" | "prefecture" | "center_lat" | "center_lng" | "boundary"
>;

type Field =
  "areaId" | "name" | "category" | "description" | "location" | "nickname";
type FieldErrors = Partial<Record<Field, string>>;

/**
 * スポットを投稿するフォーム（「穴場を教える」、#54）。送る前に API と同じスキーマ（lib/community/schema.ts）で確かめ、
 * 400 の欄ごとの理由は欄の下に、ほかのエラー（範囲の外・429・503 など）はフォームの上に出す。
 * 場所は地図をタップしてピンを置く。ピンを置くまで送信できない
 */
export function SpotSubmissionForm({
  areas,
  onSubmitted,
  onCancel,
}: {
  areas: SubmittableArea[];
  onSubmitted: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [prefecture, setPrefecture] = useState("");
  const [areaId, setAreaId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<SpotCategory | null>(null);
  const [description, setDescription] = useState("");
  const [pin, setPin] = useState<MapPoint | null>(null);
  const [nickname, setNickname] = useState(loadNickname);
  // おとりの欄。人は画面で見えないので触らない。ボットが埋めると、API は保存せずに成功を返す
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // 送信ボタンはフォームの下にあるので、上に出したエラーが見えるところまでスクロールする
  const formErrorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (formError) formErrorRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [formError]);

  const area = areas.find((a) => a.id === areaId);
  // 参照が変わると地図が描き直すので、地域ごとに1回だけ作る
  const range = useMemo(() => (area ? areaRange(area) : null), [area]);

  const remaining = LIMITS.description - countChars(description);

  const changePrefecture = (next: string) => {
    setPrefecture(next);
    // 市区町村はその県の中から選び直す
    changeArea("");
  };

  const changeArea = (next: string) => {
    setAreaId(next);
    // ほかの地域の範囲の外になるので、置いたピンは外す
    setPin(null);
  };

  const placePin = (point: MapPoint) => {
    setPin(point);
    if (fieldErrors.location) {
      setFieldErrors((errors) => ({ ...errors, location: undefined }));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setFormError(null);

    const parsed = spotSubmissionInputSchema.safeParse({
      areaId: areaId || undefined,
      name,
      category: category ?? undefined,
      description,
      lat: pin?.lat,
      lng: pin?.lng,
      nickname,
      website,
    });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error.issues));
      return;
    }
    setFieldErrors({});

    setSending(true);
    try {
      const res = await fetch("/api/spot-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data satisfies SpotSubmissionInput),
        signal: AbortSignal.timeout(POST_TIMEOUT_MS),
      });
      if (res.ok) {
        saveNickname(parsed.data.nickname);
        onSubmitted();
        return;
      }
      const error = await readApiError(res);
      setFormError(error.message);
      if (error.fields) setFieldErrors(toFieldErrors(error.fields));
      else if (error.error === "out_of_area") {
        setFieldErrors({ location: "地域の範囲の中にピンを置いてください" });
      }
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
      aria-label="穴場を教える"
      className="flex flex-col gap-5"
    >
      <p className="rounded-xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-600">
        ログインは不要です。スポット名・ひとこと・ニックネームはすぐ公開されます。管理者が非表示にすることがあります。
      </p>

      {formError && (
        <p
          ref={formErrorRef}
          role="alert"
          // 見出しの行（sticky）に隠れないよう、上に余白を取ってスクロールする
          className="scroll-mt-20 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700"
        >
          {formError}
        </p>
      )}

      <div
        role="group"
        aria-labelledby={`${id}-area-label`}
        aria-describedby={describedBy("areaId")}
        className="flex flex-col gap-1.5"
      >
        <span
          id={`${id}-area-label`}
          className="text-sm font-medium leading-none"
        >
          地域
        </span>
        {/* 県 → 市区町村の2段（#147）。送る値は市区町村（地域）の id で、県だけでは送れない（地図の範囲が地域ごとのため） */}
        <AreaSelect
          areas={areas}
          prefecture={prefecture}
          areaId={areaId}
          onPrefectureChange={changePrefecture}
          onAreaChange={changeArea}
          labelClassName="font-normal text-stone-600"
          areaSelectProps={{
            id: `${id}-areaId`,
            // 送る値は市区町村なので、必須であることを読み上げに伝える（ブラウザの検証は使わないので required ではなく aria-required）
            "aria-required": true,
            "aria-invalid": fieldErrors.areaId ? true : undefined,
            "aria-describedby": describedBy("areaId"),
          }}
        />
        <FieldError id={`${id}-areaId-error`} message={fieldErrors.areaId} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-name`}>スポット名</Label>
        <Input
          id={`${id}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={describedBy("name", `${id}-name-hint`)}
        />
        <p id={`${id}-name-hint`} className="text-xs text-stone-500">
          {LIMITS.name}文字まで
        </p>
        <FieldError id={`${id}-name-error`} message={fieldErrors.name} />
      </div>

      <fieldset
        className="flex flex-col gap-1.5"
        aria-describedby={describedBy("category")}
      >
        <legend className="mb-1.5 text-sm font-medium">カテゴリ</legend>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_ENTRIES.map(([key, { label, icon: Icon }]) => (
            <Chip
              key={key}
              active={category === key}
              onClick={() => setCategory(key)}
              className="inline-flex items-center gap-1"
            >
              <Icon aria-hidden className="h-3.5 w-3.5" />
              {label}
            </Chip>
          ))}
        </div>
        <FieldError
          id={`${id}-category-error`}
          message={fieldErrors.category}
        />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-description`}>ひとこと</Label>
        <textarea
          id={`${id}-description`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="どんなところが好きか、行くときのコツなど"
          aria-invalid={fieldErrors.description ? true : undefined}
          aria-describedby={describedBy(
            "description",
            `${id}-description-count`,
          )}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
        />
        <p
          id={`${id}-description-count`}
          className={cn(
            "text-right text-xs",
            remaining < 0 ? "font-bold text-red-700" : "text-stone-500",
          )}
        >
          {remaining < 0
            ? `${-remaining}文字多すぎます`
            : `残り${remaining}文字`}
        </p>
        <FieldError
          id={`${id}-description-error`}
          message={fieldErrors.description}
        />
      </div>

      <div
        role="group"
        aria-labelledby={`${id}-location-label`}
        aria-describedby={describedBy("location", `${id}-location-hint`)}
        className="flex flex-col gap-1.5"
      >
        <p id={`${id}-location-label`} className="text-sm font-medium">
          場所
        </p>
        {area && range ? (
          <SpotMap
            key={area.id}
            areaName={area.name}
            boundary={range}
            pin={pin}
            onMapClick={placePin}
            className={cn(
              MAP_CLASS_NAME,
              "[&_.maplibregl-canvas]:cursor-crosshair",
              fieldErrors.location && "border-red-700",
            )}
          />
        ) : (
          <div
            className={cn(
              MAP_CLASS_NAME,
              "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-stone-500",
            )}
          >
            <MapPinned aria-hidden className="h-6 w-6" />
            <span className="text-xs font-semibold">
              地域を選ぶと地図が出ます
            </span>
          </div>
        )}
        <p
          id={`${id}-location-hint`}
          aria-live="polite"
          className="text-xs text-stone-500"
        >
          {pin
            ? "ピンを置きました。置き直すときは、もう一度地図をタップしてください"
            : "地図をタップして、枠の内側にピンを置いてください"}
        </p>
        <FieldError
          id={`${id}-location-error`}
          message={fieldErrors.location}
        />
      </div>

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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {!pin && (
          <p className="text-xs text-stone-500 sm:mr-auto">
            場所にピンを置くと送信できます
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            やめる
          </Button>
          <Button type="submit" disabled={sending || !pin}>
            {sending ? "送信中…" : "投稿する"}
          </Button>
        </div>
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

/** スキーマの項目名から、画面の欄へ。緯度・経度はまとめて「場所」の欄にする */
const FIELD_OF: Record<string, Field> = {
  areaId: "areaId",
  name: "name",
  category: "category",
  description: "description",
  lat: "location",
  lng: "location",
  nickname: "nickname",
};

/** スキーマの問題（issues）か API の fields から、欄ごとの最初の理由を取り出す */
function toFieldErrors(
  source: { path: PropertyKey[]; message: string }[] | Record<string, string>,
): FieldErrors {
  const entries = Array.isArray(source)
    ? source.map((issue) => [String(issue.path[0]), issue.message] as const)
    : Object.entries(source);
  const errors: FieldErrors = {};
  for (const [key, message] of entries) {
    const field = Object.hasOwn(FIELD_OF, key) ? FIELD_OF[key] : undefined;
    if (field && !errors[field]) errors[field] = message;
  }
  return errors;
}
