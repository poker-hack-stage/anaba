"use client";

import { createContext, useContext, useMemo, useState } from "react";
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
};

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
  const selectedCandidate =
    selection?.candidates === result.candidates ? selection.index : 0;

  const value = useMemo(
    () => ({
      savedConditions,
      saveConditions,
      result,
      setResult: (next: PlannerResult, selectedIndex?: number) => {
        setResultState(next);
        if (selectedIndex !== undefined) {
          setSelection({ candidates: next.candidates, index: selectedIndex });
        }
      },
      selectedCandidate,
      selectCandidate: (index: number) =>
        setSelection({ candidates: result.candidates, index }),
    }),
    [savedConditions, result, selectedCandidate],
  );

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
