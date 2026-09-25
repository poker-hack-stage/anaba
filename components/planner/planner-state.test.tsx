import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import type { PlanCandidate } from "@/lib/planner/types";
import {
  type PlannerResult,
  PlannerStateProvider,
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

  test("絞り直して候補の配列が変わったら、同じ中身でも 0 番に戻る", () => {
    const { result } = renderState();
    act(() => result.current.setResult(done(["a", "b", "c"])));
    act(() => result.current.selectCandidate(2));

    act(() => result.current.setResult(done(["a", "b", "c"])));

    expect(result.current.selectedCandidate).toBe(0);
  });
});
