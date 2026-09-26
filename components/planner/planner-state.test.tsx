import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import type { PlanCandidate, PlanConditions } from "@/lib/planner/types";
import {
  type PlannerResult,
  PlannerStateProvider,
  toSnapshot,
  usePlannerState,
} from "./planner-state";

/** 選んでいる候補の番号は配列の参照で見分けるので、中身は id だけでよい */
function done(ids: string[]): PlannerResult {
  return {
    status: "done",
    candidates: ids.map((id) => ({ id }) as PlanCandidate),
    conditions: null,
    mode: "demo",
  };
}

function renderState() {
  return renderHook(() => usePlannerState(), {
    wrapper: PlannerStateProvider,
  });
}

describe("PlannerStateProvider の選んでいる候補", () => {
  test("はじめは 0 番で、選ぶとその番号になる", () => {
    const { result } = renderState();
    act(() => result.current.setResult(done(["a", "b", "c"])));
    expect(result.current.selectedCandidate).toBe(0);

    act(() => result.current.selectCandidate(2));

    expect(result.current.selectedCandidate).toBe(2);
  });

  test("生成中（同じ候補の配列のまま）は、選んだ番号を残す", () => {
    const { result } = renderState();
    act(() => result.current.setResult(done(["a", "b", "c"])));
    act(() => result.current.selectCandidate(2));

    const { candidates } = result.current.result;
    act(() =>
      result.current.setResult({
        status: "loading",
        candidates,
        conditions: null,
        mode: "demo",
      }),
    );

    expect(result.current.selectedCandidate).toBe(2);
  });

  test("つくり直して候補の配列が変わったら、同じ中身でも 0 番に戻る", () => {
    const { result } = renderState();
    act(() => result.current.setResult(done(["a", "b", "c"])));
    act(() => result.current.selectCandidate(2));

    act(() => result.current.setResult(done(["a", "b", "c"])));

    expect(result.current.selectedCandidate).toBe(0);
  });
});

describe("PlannerStateProvider の前のプランの履歴（#149）", () => {
  const conditions: PlanConditions = {
    areaId: null,
    duration: "day",
    interests: [],
    companion: "ひとり",
    transport: "車",
  };
  const plan = (ids: string[]): PlannerResult => ({
    ...done(ids),
    conditions,
  });

  test("積んだ順と逆に1つずつ戻し、選んでいたタブも戻す", () => {
    const { result } = renderState();
    const first = plan(["a", "b"]);
    const second = plan(["c", "d"]);
    act(() =>
      result.current.pushHistory({
        plan: toSnapshot(first, 1)!,
        addedSpot: { id: "x", name: "スポットX" },
      }),
    );
    act(() =>
      result.current.pushHistory({
        plan: toSnapshot(second, 0)!,
        addedSpot: { id: "y", name: "スポットY" },
      }),
    );
    act(() => result.current.setResult(plan(["e", "f"])));

    act(() => result.current.restorePrevious());
    expect(result.current.result.candidates).toBe(second.candidates);
    expect(result.current.result.restoredWithout).toBe("スポットY");
    expect(result.current.history).toHaveLength(1);

    act(() => result.current.restorePrevious());
    expect(result.current.result.candidates).toBe(first.candidates);
    expect(result.current.result.conditions).toBe(conditions);
    expect(result.current.result.restoredWithout).toBe("スポットX");
    expect(result.current.selectedCandidate).toBe(1);
    expect(result.current.history).toHaveLength(0);
  });

  test("clearHistory で空になり、空なら restorePrevious は何もしない", () => {
    const { result } = renderState();
    act(() =>
      result.current.pushHistory({
        plan: toSnapshot(plan(["a"]), 0)!,
        addedSpot: { id: "x", name: "スポットX" },
      }),
    );
    act(() => result.current.clearHistory());
    const current = result.current.result;

    act(() => result.current.restorePrevious());

    expect(result.current.history).toHaveLength(0);
    expect(result.current.result).toBe(current);
  });

  test("候補が出ていない結果は、取っておかない", () => {
    expect(
      toSnapshot(
        { status: "loading", candidates: [], conditions, mode: null },
        0,
      ),
    ).toBeNull();
    expect(toSnapshot({ ...plan([]) }, 0)).toBeNull();
    expect(toSnapshot({ ...done(["a"]) }, 0)).toBeNull();
  });
});
