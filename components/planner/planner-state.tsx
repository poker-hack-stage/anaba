"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { PlanSnapshot } from "@/lib/planner/plan-snapshot";
import type {
  PlanCandidate,
  PlanConditions,
  PlanResponse,
} from "@/lib/planner/types";

export type PlannerStatus = "idle" | "loading" | "done" | "error";

export type PlannerResult = {
  status: PlannerStatus;
  candidates: PlanCandidate[];
  /** この結果を出したときの条件（idle のときは null）。今の条件とずれていないか比べるのに使う */
  conditions: PlanConditions | null;
  /** 候補の作り方（Gemini か、Gemini を使わないデモモードか）。結果がないときは null */
  mode: PlanResponse["mode"] | null;
  /** /api/plan が 429（レート制限、#25）を返し、ブラウザでデモモードの候補を作ったとき true */
  rateLimited?: boolean;
  /** 「このスポットを経路に加えて作り直す」（#32）に失敗したときの文言。元の候補を残したまま出す */
  rebuildError?: string;
  /** 「前のプランに戻る」（#149）で戻したとき、経路から外れたスポットの名前 */
  restoredWithout?: string;
};

/** 「前のプランに戻る」の履歴の1段。作り直す（#32）前のプランと、そのとき経路に加えたスポット */
export type PlanHistoryEntry = {
  plan: PlanSnapshot;
  addedSpot: { id: string; name: string };
};

/** 結果を取っておく形にする。候補が出ていない（作っている間・エラー）なら null */
export function toSnapshot(
  result: PlannerResult,
  selectedIndex: number,
): PlanSnapshot | null {
  if (
    result.status !== "done" ||
    result.conditions === null ||
    result.mode === null ||
    result.candidates.length === 0
  ) {
    return null;
  }
  return {
    conditions: result.conditions,
    candidates: result.candidates,
    mode: result.mode,
    rateLimited: result.rateLimited ?? false,
    selectedIndex,
  };
}

type PlannerState = {
  /** 最後に選んだ条件。URL にクエリがないとき（タブで戻ってきたとき）に使う */
  savedConditions: PlanConditions | null;
  saveConditions: (conditions: PlanConditions) => void;
  result: PlannerResult;
  /** selectedIndex を渡すと、新しい候補の中でその番号を選ぶ（渡さなければ 0 番） */
  setResult: (result: PlannerResult, selectedIndex?: number) => void;
  /** タブで選んでいる候補の番号（0 始まり）。候補が変わったら（つくり直し）0 に戻る */
  selectedCandidate: number;
  selectCandidate: (index: number) => void;
  /** 作り直す前のプラン。最後が直前のもの。作り直した回数ぶん積む（#149） */
  history: PlanHistoryEntry[];
  pushHistory: (entry: PlanHistoryEntry) => void;
  /** 新しく作ったとき（「旅プランをつくる」「この条件でつくり直す」）に空にする */
  clearHistory: () => void;
  /** 履歴から1つ取り出し、作り直す前と同じ候補・選んでいたタブに戻す（呼び直さない） */
  restorePrevious: () => void;
};

const PlannerStateContext = createContext<PlannerState | null>(null);

// AI旅プランの条件と結果（選んでいる候補も）を app/layout.tsx に置き、タブを切り替えても消えないようにする
export function PlannerStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [savedConditions, saveConditions] = useState<PlanConditions | null>(
    null,
  );
  const [result, setResultState] = useState<PlannerResult>({
    status: "idle",
    candidates: [],
    conditions: null,
    mode: null,
  });
  // 選んだ番号は、どの候補の中で選んだかと一緒に持つ。候補の配列が差し替わったら（つくり直し）選び直しになり、0 番を返す
  const [selection, setSelection] = useState<{
    candidates: PlanCandidate[];
    index: number;
  } | null>(null);
  // 履歴はページの中の状態だけで持つ。ブラウザの「戻る」とは連動させない（URL の条件とぶつからないため、#149 の決定）
  const [history, setHistory] = useState<PlanHistoryEntry[]>([]);
  const selectedCandidate =
    selection?.candidates === result.candidates ? selection.index : 0;

  const value = useMemo(() => {
    const setResult = (next: PlannerResult, selectedIndex?: number) => {
      setResultState(next);
      if (selectedIndex !== undefined) {
        setSelection({ candidates: next.candidates, index: selectedIndex });
      }
    };
    return {
      savedConditions,
      saveConditions,
      result,
      setResult,
      selectedCandidate,
      selectCandidate: (index: number) =>
        setSelection({ candidates: result.candidates, index }),
      history,
      pushHistory: (entry: PlanHistoryEntry) =>
        setHistory((prev) => [...prev, entry]),
      clearHistory: () => setHistory([]),
      restorePrevious: () => {
        const last = history.at(-1);
        if (!last) return;
        setHistory(history.slice(0, -1));
        const { plan, addedSpot } = last;
        setResult(
          {
            status: "done",
            candidates: plan.candidates,
            conditions: plan.conditions,
            mode: plan.mode,
            rateLimited: plan.rateLimited,
            restoredWithout: addedSpot.name,
          },
          plan.selectedIndex,
        );
      },
    };
  }, [savedConditions, result, selectedCandidate, history]);

  return (
    <PlannerStateContext.Provider value={value}>
      {children}
    </PlannerStateContext.Provider>
  );
}

export function usePlannerState() {
  const state = useContext(PlannerStateContext);
  if (!state) {
    throw new Error("PlannerStateProvider の内側で使ってください");
  }
  return state;
}
