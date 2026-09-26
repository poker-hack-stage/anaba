"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  FlaskConical,
  Loader2,
  Route,
  Search,
  SearchX,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SpotDetailDialog } from "@/components/spots/spot-detail-dialog";
import { Chip } from "@/components/ui/chip";
import { Select } from "@/components/ui/select";
import type { Spot } from "@/lib/data/spots";
import { groupAreasByPrefecture } from "@/lib/planner/area-groups";
import { DURATION_LABELS } from "@/lib/planner/duration";
import {
  ANY_AREA_LABEL,
  COMPANIONS,
  DURATIONS,
  INTERESTS,
  TRANSPORTS,
} from "@/lib/planner/options";
import { generateCandidates, type PlannableArea } from "@/lib/planner/generate";
import { MAX_NOTE_LENGTH, normalizeNote, noteLength } from "@/lib/planner/note";
import type {
  PlanCandidate,
  PlanConditions,
  PlanDuration,
  PlanResponse,
} from "@/lib/planner/types";
import { cn } from "@/lib/utils";
import { CandidateTabs } from "./candidate-tabs";
import {
  type PlannerResult,
  type PlannerStatus,
  usePlannerState,
} from "./planner-state";

/**
 * /api/plan の応答を待つ上限。サーバーは Gemini を最大45秒待ち、だめならデモモードで返す（maxDuration は60秒）ので、
 * それより先にブラウザ側が諦めないよう長めに取る。時間切れならブラウザでデモモードの候補を作る
 */
const PLAN_TIMEOUT_MS = 55_000;

const DEFAULT_CONDITIONS: PlanConditions = {
  areaId: null,
  duration: DURATIONS[0],
  interests: [],
  companion: COMPANIONS[0],
  transport: TRANSPORTS[0],
};

/** URL のクエリで「おまかせ」を表す値（地域の id と重ならない） */
const ANY_AREA_QUERY = "any";

/** 希望（#114）を送る形にする。改行・制御文字を空白にし、長さで切る。空なら undefined（書かなかった） */
function toNote(text: string): string | undefined {
  const note = [...normalizeNote(text)].slice(0, MAX_NOTE_LENGTH).join("");
  return note || undefined;
}

/**
 * 条件を URL のクエリにする（例: ?area=<地域の id>&duration=1n2d&interests=食&interests=温泉&…&note=…）。
 * 「クエリがない = タブやリンクから来た」と見分けるため、既定値も含めて書く（希望は書いたときだけ）
 */
function toQuery(conditions: PlanConditions) {
  const params = new URLSearchParams({
    area: conditions.areaId ?? ANY_AREA_QUERY,
    duration: conditions.duration,
    companion: conditions.companion,
    transport: conditions.transport,
  });
  for (const interest of conditions.interests) {
    params.append("interests", interest);
  }
  if (conditions.note) params.set("note", conditions.note);
  return params.toString();
}

/** 条件のクエリのキー（toQuery と同じ並び） */
const QUERY_KEYS = [
  "area",
  "duration",
  "companion",
  "transport",
  "interests",
  "note",
];

/** URL のクエリのうち、条件のキーだけを toQuery と同じ並びで取り出す */
function pickConditionQuery(params: URLSearchParams) {
  const picked = new URLSearchParams();
  for (const key of QUERY_KEYS) {
    for (const value of params.getAll(key)) picked.append(key, value);
  }
  return picked.toString();
}

/** URL のクエリから条件を読む。クエリがなければ null。知らない値は既定値（地域は「おまかせ」）にする */
function fromQuery(
  params: URLSearchParams,
  areaIds: readonly string[],
): PlanConditions | null {
  if (!QUERY_KEYS.some((key) => params.has(key))) return null;

  const pick = <T extends string>(
    key: string,
    options: readonly T[],
    fallback: T,
  ): T => {
    const value = params.get(key);
    return options.includes(value as T) ? (value as T) : fallback;
  };
  const area = params.get("area");
  return {
    areaId: area !== null && areaIds.includes(area) ? area : null,
    duration: pick("duration", DURATIONS, DEFAULT_CONDITIONS.duration),
    interests: INTERESTS.filter((i) => params.getAll("interests").includes(i)),
    companion: pick("companion", COMPANIONS, DEFAULT_CONDITIONS.companion),
    transport: pick("transport", TRANSPORTS, DEFAULT_CONDITIONS.transport),
    note: toNote(params.get("note") ?? ""),
  };
}

/**
 * 画面を再読み込みせずに URL のクエリの条件のキーだけ書き換える（useSearchParams にも反映される）。
 * ほかのキー（utm_source など）はそのまま残す
 */
function replaceQuery(conditions: PlanConditions) {
  const params = new URLSearchParams(window.location.search);
  for (const key of QUERY_KEYS) params.delete(key);
  for (const [key, value] of new URLSearchParams(toQuery(conditions))) {
    params.append(key, value);
  }
  window.history.replaceState(null, "", `?${params.toString()}`);
}

// 条件は URL のクエリに持つ（再読み込み・共有しても同じ条件になる）。
// 結果と最後の条件は app/layout.tsx の PlannerStateProvider に持ち、タブを切り替えても残す
export function PlannerForm({ areas }: { areas: PlannableArea[] }) {
  const searchParams = useSearchParams();
  const {
    savedConditions,
    saveConditions,
    result,
    setResult,
    selectedCandidate,
    selectCandidate,
  } = usePlannerState();
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  // 入力中の希望（#114）。null なら、URL の条件の希望を出す。
  // 1文字ごとに URL を書き換えると Safari の replaceState の回数制限に当たるので、
  // URL に書くのはフォーカスが外れたときと「絞る」を押したときだけにする
  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  const areaIds = useMemo(() => areas.map((area) => area.id), [areas]);
  const queryConditions = useMemo(
    () => fromQuery(searchParams, areaIds),
    [searchParams, areaIds],
  );
  const conditions = queryConditions ?? savedConditions ?? DEFAULT_CONDITIONS;
  const { status, candidates, mode, rateLimited = false } = result;
  // 表示中の候補が今の条件で出したものでないとき（読み込み中や結果が出たあとに条件を変えた、
  // ブラウザの「戻る」で前の条件に戻ったなど）は、そのことを知らせる
  const isStale =
    status === "done" &&
    result.conditions !== null &&
    toQuery(result.conditions) !== toQuery(conditions);

  useEffect(() => {
    if (queryConditions) {
      // 知らない値や並びの違うクエリは、画面に出している条件に合わせて書き直す
      if (pickConditionQuery(searchParams) !== toQuery(queryConditions)) {
        replaceQuery(queryConditions);
      }
      // URL の条件を覚えておく（タブで戻ってきたときに使う）
      if (
        !savedConditions ||
        toQuery(savedConditions) !== toQuery(queryConditions)
      ) {
        saveConditions(queryConditions);
      }
    } else if (savedConditions) {
      // タブで戻ってきて URL にクエリがないときは、覚えている条件を URL に戻す
      replaceQuery(savedConditions);
    }
  }, [searchParams, queryConditions, savedConditions, saveConditions]);

  // URL の希望が、入力中の文と違うものに変わったら（ブラウザの「戻る」など）、入力中の文を捨てて URL に合わせる。
  // 書いた希望が URL に反映されるまでの間は、入力中の文を出したままにする
  const [noteInUrl, setNoteInUrl] = useState(conditions.note);
  if (noteInUrl !== conditions.note) {
    setNoteInUrl(conditions.note);
    if (noteDraft !== null && toNote(noteDraft) !== conditions.note) {
      setNoteDraft(null);
    }
  }

  const set = <K extends keyof PlanConditions>(
    key: K,
    value: PlanConditions[K],
  ) => replaceQuery({ ...conditions, [key]: value });

  /** 入力中の希望を URL の条件に書き、書いたあとの条件を返す */
  const commitNote = (): PlanConditions => {
    if (noteDraft === null) return conditions;
    const next = { ...conditions, note: toNote(noteDraft) };
    if (toQuery(next) !== toQuery(conditions)) replaceQuery(next);
    return next;
  };

  const toggleInterest = (interest: string) =>
    set(
      "interests",
      conditions.interests.includes(interest)
        ? conditions.interests.filter((i) => i !== interest)
        : [...conditions.interests, interest],
    );

  /**
   * /api/plan を呼んで、表示する結果を返す。429（同じ送信元から短い時間に何度も作った、#25）なら、
   * ブラウザでデモモードの候補を作り、理由を表示する。エラー・時間切れは例外にする
   */
  const fetchPlan = async (
    requested: PlanConditions,
  ): Promise<PlannerResult> => {
    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requested),
      // 応答が返ってこないと loading のまま抜けられないので、時間切れは error にする
      signal: AbortSignal.timeout(PLAN_TIMEOUT_MS),
    });
    if (res.status === 429) {
      return {
        status: "done",
        candidates: generateCandidates(areas, requested),
        conditions: requested,
        mode: "demo",
        rateLimited: true,
      };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as PlanResponse;
    return {
      status: "done",
      candidates: data.candidates,
      conditions: requested,
      mode: data.mode,
    };
  };

  const submit = async () => {
    // 結果は Context に入れるので、読み込み中に別のタブへ移動しても戻ると表示される
    // 結果には、送ったときの条件を付けておく（あとで条件が変わってもずれが分かるように）
    const requested = commitNote();
    setResult({ status: "loading", candidates, conditions: requested, mode });
    try {
      setResult(await fetchPlan(requested));
    } catch {
      // API がエラー・時間切れでもデモが止まらないよう、ブラウザでデモモードの候補を作る（#19）
      try {
        setResult({
          status: "done",
          candidates: generateCandidates(areas, requested),
          conditions: requested,
          mode: "demo",
        });
      } catch {
        setResult({
          status: "error",
          candidates: [],
          conditions: requested,
          mode: null,
        });
      }
    }
  };

  /**
   * 経路外のスポットを経路に加えて作り直す（#32）。今の候補を出したときの条件（フォームで変えた条件ではなく）に
   * スポットの id を足して呼び直す。失敗したら（候補が0件も）、元の候補と選んでいたタブに戻してエラーを出す
   */
  const rebuildWithSpot = async (spot: Spot) => {
    const previous = result;
    const previousIndex = selectedCandidate;
    const previousId = candidates[previousIndex]?.id;
    const requested: PlanConditions = {
      ...(previous.conditions ?? conditions),
      includeSpotId: spot.id,
    };
    setSelectedSpot(null);
    setResult({
      status: "loading",
      candidates,
      conditions: requested,
      mode,
    });
    let rebuilt: PlannerResult | null = null;
    let error: string;
    try {
      rebuilt = await fetchPlan(requested);
      error = `「${spot.name}」を経路に入れた候補を組めませんでした。元の候補のままです。`;
    } catch {
      error =
        "候補を作り直せませんでした。元の候補のままです。時間をおいて、もう一度お試しください。";
    }
    if (rebuilt && rebuilt.candidates.length > 0) {
      // 元と同じ地域の候補があれば、そのタブを選んだままにする
      const index = rebuilt.candidates.findIndex((c) => c.id === previousId);
      setResult(rebuilt, Math.max(index, 0));
      return;
    }
    setResult({ ...previous, rebuildError: error }, previousIndex);
  };

  // 詳細の「経路に加えて作り直す」は、表示中の候補の経路外のスポットを開いたときだけ出す
  const shownCandidate =
    candidates[Math.min(selectedCandidate, candidates.length - 1)];
  const canRebuildWithSpot =
    status === "done" &&
    selectedSpot !== null &&
    shownCandidate?.otherSpots.some((s) => s.id === selectedSpot.id) === true;

  const closeDetail = useCallback(() => setSelectedSpot(null), []);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="flex h-fit flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 lg:sticky lg:top-24">
        <h2 className="font-extrabold text-stone-900">旅の条件</h2>
        <AreaField
          areas={areas}
          areaId={conditions.areaId}
          onChange={(areaId) => set("areaId", areaId)}
        />
        <Choice
          label="日程"
          options={DURATIONS.map((d) => DURATION_LABELS[d])}
          selected={[DURATION_LABELS[conditions.duration]]}
          onSelect={(label) => set("duration", toDuration(label))}
        />
        <Choice
          label="興味のあること（複数選べます）"
          options={INTERESTS}
          selected={conditions.interests}
          onSelect={toggleInterest}
        />
        <Choice
          label="だれと"
          options={COMPANIONS}
          selected={[conditions.companion]}
          onSelect={(v) => set("companion", v)}
        />
        <Choice
          label="移動手段"
          options={TRANSPORTS}
          selected={[conditions.transport]}
          onSelect={(v) => set("transport", v)}
        />
        <NoteField
          value={noteDraft ?? conditions.note ?? ""}
          onChange={setNoteDraft}
          onBlur={commitNote}
        />
        <button
          type="button"
          onClick={submit}
          disabled={status === "loading"}
          className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-ink py-3 text-sm font-bold text-white transition-all hover:bg-ink/90 active:scale-[0.98] disabled:opacity-60"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {status === "done" ? "この条件で絞り直す" : "絞る"}
        </button>
      </section>

      <section className="flex flex-col gap-4">
        {isStale && (
          <p
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            条件が変わっています。「この条件で絞り直す」で更新できます。
          </p>
        )}
        <Result
          status={status}
          candidates={candidates}
          mode={mode}
          rateLimited={rateLimited}
          hasNote={result.conditions?.note !== undefined}
          rebuildError={result.rebuildError}
          selectedCandidate={selectedCandidate}
          onSelectCandidate={selectCandidate}
          onSpotClick={setSelectedSpot}
        />
      </section>

      <SpotDetailDialog
        spot={selectedSpot}
        onClose={closeDetail}
        onIncludeInRoute={canRebuildWithSpot ? rebuildWithSpot : undefined}
      />
    </div>
  );
}

function Result({
  status,
  candidates,
  mode,
  rateLimited,
  hasNote,
  rebuildError,
  selectedCandidate,
  onSelectCandidate,
  onSpotClick,
}: {
  status: PlannerStatus;
  candidates: PlanCandidate[];
  mode: PlanResponse["mode"] | null;
  rateLimited: boolean;
  /** 候補を出したときの条件に、自由記述の希望（#114）があったか */
  hasNote: boolean;
  rebuildError?: string;
  selectedCandidate: number;
  onSelectCandidate: (index: number) => void;
  onSpotClick: (spot: Spot) => void;
}) {
  if (status === "idle") {
    return (
      <EmptyState
        icon={Route}
        title="旅の候補がここに表示されます"
        description="左の条件を選んで「絞る」を押すと、おすすめの地域とルートを地図つきで提案します。"
        className="h-full min-h-72"
      />
    );
  }
  if (status === "loading") {
    // 候補はタブで1件ずつ見せるので、タブと1件ぶんのカードの形にする
    return (
      <div className="flex flex-col gap-3">
        <div className="h-14 animate-pulse rounded-2xl bg-stone-200/60" />
        <div className="h-[36rem] animate-pulse rounded-2xl bg-stone-200/60" />
      </div>
    );
  }
  if (status === "error") {
    return (
      <EmptyState
        icon={SearchX}
        title="候補を取得できませんでした"
        description="時間をおいて、もう一度「絞る」を押してください。"
        className="min-h-72"
      />
    );
  }
  if (candidates.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="この条件では候補を組めませんでした"
        description="日程を短くするか、エリアを「おまかせ」にしてください。"
        className="min-h-72"
      />
    );
  }
  return (
    <>
      {rebuildError && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{rebuildError}</span>
        </p>
      )}
      {mode === "demo" && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700"
        >
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {rateLimited
              ? "短い時間に何度も作ったため、デモモードで作成しました。しばらくしてから絞り直すと、AI で作れます。"
              : "デモモードで作成しました。"}
            AI を使わず、興味に合うスポットを穴場度の高い順に選んでいます。
            {hasNote &&
              "希望は、デモモードでは一部（雨・屋内、ゆっくり・のんびり、子ども）だけ反映しています。"}
          </span>
        </p>
      )}
      <CandidateTabs
        candidates={candidates}
        selectedIndex={selectedCandidate}
        onSelect={onSelectCandidate}
        onSpotClick={onSpotClick}
      />
    </>
  );
}

/** 日程の表示の文言から、日程のコードに戻す */
function toDuration(label: string): PlanDuration {
  return DURATIONS.find((d) => DURATION_LABELS[d] === label) ?? DURATIONS[0];
}

/**
 * エリア: 「おまかせ」のチップと、都道府県ごとの optgroup にまとめた地域の select（docs/spec.md の画面-1）。
 * 送る値は地域の id（同じ名前の市町村がありうるため）
 */
function AreaField({
  areas,
  areaId,
  onChange,
}: {
  areas: PlannableArea[];
  areaId: string | null;
  onChange: (areaId: string | null) => void;
}) {
  const selectId = useId();
  return (
    <div>
      <label
        htmlFor={selectId}
        className="mb-1.5 block text-xs font-bold text-stone-700"
      >
        エリア
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip active={areaId === null} onClick={() => onChange(null)}>
          {ANY_AREA_LABEL}
        </Chip>
        <Select
          id={selectId}
          shape="pill"
          value={areaId ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          containerClassName="min-w-0 flex-1"
          // 地域を選んでいるときは、選択中の Chip と同じ濃い枠にする
          className={cn(
            areaId === null
              ? "text-stone-600"
              : "border-stone-900 hover:border-stone-900",
          )}
        >
          <option value="">地域を選ぶ</option>
          {groupAreasByPrefecture(areas).map((group) => (
            <optgroup key={group.prefecture} label={group.prefecture}>
              {group.areas.map((area) => (
                // 選択肢の一覧で都道府県の見出しが見えないブラウザがあり、選んだ後の欄にも出ないので、名前に添える
                <option key={area.id} value={area.id}>
                  {area.name}（{group.prefecture}）
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>
    </div>
  );
}

/** 自由記述の希望（#114）。100字まで、残りの文字数を出す */
function NoteField({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const id = useId();
  const remaining = Math.max(0, MAX_NOTE_LENGTH - noteLength(value));
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-bold text-stone-700"
      >
        ほかに希望があれば（任意）
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={2}
        maxLength={MAX_NOTE_LENGTH}
        placeholder="例: 雨でも楽しめる所がいい、ゆっくり回りたい"
        aria-describedby={`${id}-count`}
        className="block w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-base text-stone-900 transition-colors placeholder:text-stone-400 hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
      />
      <p id={`${id}-count`} className="mt-1 text-right text-xs text-stone-500">
        残り{remaining}文字
      </p>
    </div>
  );
}

function Choice({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold text-stone-700">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <Chip
            key={option}
            active={selected.includes(option)}
            onClick={() => onSelect(option)}
          >
            {option}
          </Chip>
        ))}
      </div>
    </div>
  );
}
