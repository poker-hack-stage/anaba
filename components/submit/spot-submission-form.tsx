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
import { PrefectureSelect } from "@/components/ui/prefecture-select";
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
  toSubmissionResult,
  type SpotSubmissionInput,
  type SubmissionStatus,
} from "@/lib/community/schema";
import type { Area } from "@/lib/data/areas";
import {
  MUNICIPALITY_ATTRIBUTION,
  findMunicipality,
  prefectureBounds,
  type MunicipalityIndex,
} from "@/lib/geo/municipalities";
import { CATEGORIES, type SpotCategory } from "@/lib/spots/categories";
import { cn } from "@/lib/utils";
import { areaRange, findAreaForPoint } from "./area-range";

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
  | "prefecture"
  | "municipality"
  | "name"
  | "category"
  | "description"
  | "location"
  | "nickname";
type FieldErrors = Partial<Record<Field, string>>;

/**
 * スポットを投稿するフォーム（「穴場を教える」、#54）。送る前に API と同じスキーマ（lib/community/schema.ts）で確かめ、
 * 400 の欄ごとの理由は欄の下に、ほかのエラー（429・503 など）はフォームの上に出す。
 * 場所は47都道府県から県を選び、市区町村を入力して（候補から選ぶ）、地図をタップしてピンを置く。ピンを置くまで送信できない。
 * ピンが anaba の地域の中ならすぐ公開、外なら公開待ちの候補になる（地図の下で先に知らせる。決めるのは DB）
 */
export function SpotSubmissionForm({
  areas,
  municipalities,
  onSubmitted,
  onCancel,
}: {
  areas: SubmittableArea[];
  /** 市区町村の候補（lib/geo/municipalities.ts の loadMunicipalities()） */
  municipalities: MunicipalityIndex;
  onSubmitted: (status: SubmissionStatus) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [prefecture, setPrefecture] = useState("");
  const [municipalityText, setMunicipalityText] = useState("");
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

  const municipality = findMunicipality(
    municipalities,
    prefecture,
    municipalityText,
  );
  // 選んだ市区町村が anaba の地域なら、その範囲（境界）を地図に出す
  const area = municipality
    ? areas.find(
        (a) => a.prefecture === prefecture && a.name === municipality.name,
      )
    : undefined;
  // 参照が変わると地図が描き直すので、地域ごとに1回だけ作る
  const range = useMemo(() => (area ? areaRange(area) : null), [area]);
  // 地図に入れる範囲。市区町村が決まればその町、まだなら県全体
  const fitPoints = useMemo((): [number, number][] => {
    const box =
      municipality?.bounds ?? prefectureBounds(municipalities, prefecture);
    return box ? [box[0], box[1]] : [];
  }, [municipality, municipalities, prefecture]);
  // ピンが入る地域（すぐ公開になるか、公開待ちの候補になるかを先に知らせる）
  const pinArea = pin ? findAreaForPoint(areas, pin) : undefined;
  const municipalityOptions = municipalities[prefecture] ?? [];

  const remaining = LIMITS.description - countChars(description);

  const changePrefecture = (next: string) => {
    setPrefecture(next);
    // 市区町村はその県の中から選び直す。地図もその県へ移るので、置いたピンは外す
    setMunicipalityText("");
    setPin(null);
    clearFieldError("prefecture", "municipality", "location");
  };

  const changeMunicipality = (next: string) => {
    const before = municipality?.name;
    setMunicipalityText(next);
    // 別の町に決まったら、地図がその町へ移るので、置いたピンは外す
    const after = findMunicipality(municipalities, prefecture, next)?.name;
    if (after && after !== before) setPin(null);
    clearFieldError("municipality");
  };

  const clearFieldError = (...fields: Field[]) => {
    if (fields.some((field) => fieldErrors[field])) {
      setFieldErrors((errors) => {
        const next = { ...errors };
        for (const field of fields) delete next[field];
        return next;
      });
    }
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
      prefecture: prefecture || undefined,
      municipality: municipalityText,
      name,
      category: category ?? undefined,
      description,
      lat: pin?.lat,
      lng: pin?.lng,
      nickname,
      website,
    });
    // 市区町村は候補の名前だけ（API も確かめる）
    const municipalityError =
      parsed.success && !municipality
        ? { municipality: "市区町村は候補から選んでください" }
        : {};
    if (!parsed.success || !municipality) {
      setFieldErrors({
        ...(parsed.success ? {} : toFieldErrors(parsed.error.issues)),
        ...municipalityError,
      });
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
        const result = toSubmissionResult(await res.json().catch(() => null));
        onSubmitted(result?.status ?? "published");
        return;
      }
      const error = await readApiError(res);
      setFormError(error.message);
      if (error.fields) setFieldErrors(toFieldErrors(error.fields));
      else if (error.error === "out_of_area") {
        setFieldErrors({ location: "日本の中にピンを置いてください" });
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
        className="flex flex-col gap-1.5"
      >
        <span
          id={`${id}-area-label`}
          className="text-sm font-medium leading-none"
        >
          地域
        </span>
        {/* 47都道府県から県を選び、市区町村は入力する（その県の候補がブラウザの候補に出る） */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <label
              htmlFor={`${id}-prefecture`}
              className="block text-xs font-normal text-stone-600"
            >
              都道府県
            </label>
            <PrefectureSelect
              id={`${id}-prefecture`}
              value={prefecture}
              onChange={changePrefecture}
              aria-required
              aria-invalid={fieldErrors.prefecture ? true : undefined}
              aria-describedby={describedBy("prefecture")}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label
              htmlFor={`${id}-municipality`}
              className="block text-xs font-normal text-stone-600"
            >
              市区町村
            </label>
            <Input
              id={`${id}-municipality`}
              value={municipalityText}
              onChange={(e) => changeMunicipality(e.target.value)}
              list={`${id}-municipality-options`}
              disabled={prefecture === ""}
              placeholder={prefecture === "" ? "先に県を選ぶ" : "例: 松本市"}
              autoComplete="off"
              aria-required
              aria-invalid={fieldErrors.municipality ? true : undefined}
              aria-describedby={describedBy(
                "municipality",
                `${id}-municipality-hint`,
              )}
            />
            <datalist id={`${id}-municipality-options`}>
              {municipalityOptions.map((m) => (
                <option key={m.name} value={m.name} />
              ))}
            </datalist>
          </div>
        </div>
        <p id={`${id}-municipality-hint`} className="text-xs text-stone-500">
          市区町村は、入力すると出る候補から選んでください。
          {MUNICIPALITY_ATTRIBUTION}
        </p>
        <FieldError
          id={`${id}-prefecture-error`}
          message={fieldErrors.prefecture}
        />
        <FieldError
          id={`${id}-municipality-error`}
          message={fieldErrors.municipality}
        />
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
        {prefecture !== "" ? (
          <SpotMap
            key={prefecture}
            areaName={municipality?.name ?? prefecture}
            boundary={range}
            fitPoints={fitPoints}
            pin={pin}
            onMapClick={placePin}
            animateMove
            emptyPlaceholder={false}
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
              都道府県を選ぶと地図が出ます
            </span>
          </div>
        )}
        <p
          id={`${id}-location-hint`}
          aria-live="polite"
          className="text-xs text-stone-500"
        >
          {!pin
            ? "地図をタップして、スポットの場所にピンを置いてください"
            : pinArea
              ? `ピンを置きました（${pinArea.name}）。投稿するとすぐ公開されます`
              : "ピンを置きました。anaba の地域がまだない場所なので、公開待ちの候補として受け付けます（地域ができたら公開します）"}
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
  prefecture: "prefecture",
  municipality: "municipality",
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
