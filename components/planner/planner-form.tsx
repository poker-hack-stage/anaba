"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Route, Search, SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SpotDetailDialog } from "@/components/spots/spot-detail-dialog";
import { Chip } from "@/components/ui/chip";
import type { Spot } from "@/lib/data/spots";
import type {
  PlanCandidate,
  PlanConditions,
  PlanResponse,
} from "@/lib/planner/types";
import { CandidateCard } from "./candidate-card";
import { type PlannerStatus, usePlannerState } from "./planner-state";

const DURATIONS = ["日帰り", "1泊2日", "2泊3日"];
const INTERESTS = ["食", "自然", "絶景", "温泉", "体験", "歴史"];
const COMPANIONS = ["ひとり", "友人", "カップル", "家族（子連れ）"];
const TRANSPORTS = ["車", "電車・バス", "自転車"];

const DEFAULT_CONDITIONS: PlanConditions = {
  area: "おまかせ",
  duration: DURATIONS[0],
  interests: [],
  companion: COMPANIONS[0],
  transport: TRANSPORTS[0],
};

/**
 * 条件を URL のクエリにする（例: ?area=…&duration=…&interests=食&interests=温泉&…）。
 * 「クエリがない = まだ選んでいない」と見分けるため、既定値も含めて書く
 */
function toQuery(conditions: PlanConditions) {
  const params = new URLSearchParams({
    area: conditions.area,
    duration: conditions.duration,
    companion: conditions.companion,
    transport: conditions.transport,
  });
  for (const interest of conditions.interests) {
    params.append("interests", interest);
  }
  return params.toString();
}

/** URL のクエリから条件を読む。クエリがなければ null。知らない値は既定値にする */
function fromQuery(
  params: URLSearchParams,
  areaOptions: string[],
): PlanConditions | null {
  const keys = ["area", "duration", "interests", "companion", "transport"];
  if (!keys.some((key) => params.has(key))) return null;

  const pick = (key: string, options: string[], fallback: string) => {
    const value = params.get(key);
    return value && options.includes(value) ? value : fallback;
  };
  return {
    area: pick("area", areaOptions, DEFAULT_CONDITIONS.area),
    duration: pick("duration", DURATIONS, DEFAULT_CONDITIONS.duration),
    interests: INTERESTS.filter((i) => params.getAll("interests").includes(i)),
    companion: pick("companion", COMPANIONS, DEFAULT_CONDITIONS.companion),
    transport: pick("transport", TRANSPORTS, DEFAULT_CONDITIONS.transport),
  };
}

/** 画面を再読み込みせずに URL のクエリだけ書き換える（useSearchParams にも反映される） */
function replaceQuery(query: string) {
  window.history.replaceState(null, "", `?${query}`);
}

// 条件は URL のクエリに持つ（再読み込み・共有しても同じ条件になる）。
// 結果と最後の条件は app/layout.tsx の PlannerStateProvider に持ち、タブを切り替えても残す
export function PlannerForm({ areaNames }: { areaNames: string[] }) {
  const searchParams = useSearchParams();
  const { savedConditions, saveConditions, result, setResult } =
    usePlannerState();
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);

  const areaOptions = useMemo(() => ["おまかせ", ...areaNames], [areaNames]);
  const queryConditions = useMemo(
    () => fromQuery(searchParams, areaOptions),
    [searchParams, areaOptions],
  );
  const conditions = queryConditions ?? savedConditions ?? DEFAULT_CONDITIONS;
  const { status, candidates } = result;

  useEffect(() => {
    if (queryConditions) {
      // URL の条件を覚えておく（タブで戻ってきたときに使う）
      if (
        !savedConditions ||
        toQuery(savedConditions) !== toQuery(queryConditions)
      ) {
        saveConditions(queryConditions);
      }
    } else if (savedConditions) {
      // タブで戻ってきて URL にクエリがないときは、覚えている条件を URL に戻す
      replaceQuery(toQuery(savedConditions));
    }
  }, [queryConditions, savedConditions, saveConditions]);

  const set = <K extends keyof PlanConditions>(
    key: K,
    value: PlanConditions[K],
  ) => replaceQuery(toQuery({ ...conditions, [key]: value }));

  const toggleInterest = (interest: string) =>
    set(
      "interests",
      conditions.interests.includes(interest)
        ? conditions.interests.filter((i) => i !== interest)
        : [...conditions.interests, interest],
    );

  const submit = async () => {
    // 結果は Context に入れるので、読み込み中に別のタブへ移動しても戻ると表示される
    setResult({ status: "loading", candidates });
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(conditions),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as PlanResponse;
      setResult({ status: "done", candidates: data.candidates });
    } catch {
      setResult({ status: "error", candidates: [] });
    }
  };

  const closeDetail = useCallback(() => setSelectedSpot(null), []);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="flex h-fit flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 lg:sticky lg:top-24">
        <h2 className="font-extrabold text-stone-900">旅の条件</h2>
        <Choice
          label="エリア"
          options={["おまかせ", ...areaNames]}
          selected={[conditions.area]}
          onSelect={(v) => set("area", v)}
        />
        <Choice
          label="日程"
          options={DURATIONS}
          selected={[conditions.duration]}
          onSelect={(v) => set("duration", v)}
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
        <Result
          status={status}
          candidates={candidates}
          onSpotClick={setSelectedSpot}
        />
      </section>

      <SpotDetailDialog spot={selectedSpot} onClose={closeDetail} />
    </div>
  );
}

function Result({
  status,
  candidates,
  onSpotClick,
}: {
  status: PlannerStatus;
  candidates: PlanCandidate[];
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
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-96 animate-pulse rounded-2xl bg-stone-200/60"
          />
        ))}
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
        title="条件に合う候補がありません"
        description="条件を変えて、もう一度絞ってみてください。"
        className="min-h-72"
      />
    );
  }
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {candidates.map((candidate, i) => (
        <CandidateCard
          key={candidate.id}
          candidate={candidate}
          index={i}
          onSpotClick={onSpotClick}
        />
      ))}
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
  options: string[];
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
