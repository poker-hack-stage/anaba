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
};

type PlannerState = {
  /** 最後に選んだ条件。URL にクエリがないとき（タブで戻ってきたとき）に使う */
  savedConditions: PlanConditions | null;
  saveConditions: (conditions: PlanConditions) => void;
  result: PlannerResult;
  setResult: (result: PlannerResult) => void;
};

const PlannerStateContext = createContext<PlannerState | null>(null);

// AI旅プランの条件と結果を app/layout.tsx に置き、タブを切り替えても消えないようにする
export function PlannerStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [savedConditions, saveConditions] = useState<PlanConditions | null>(
    null,
  );
  const [result, setResult] = useState<PlannerResult>({
    status: "idle",
    candidates: [],
    conditions: null,
    mode: null,
  });

  const value = useMemo(
    () => ({ savedConditions, saveConditions, result, setResult }),
    [savedConditions, result],
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
