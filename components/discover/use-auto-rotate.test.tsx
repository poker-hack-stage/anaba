import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { TOUCH_PAUSE_MS, useAutoRotate } from "./use-auto-rotate";

/** 切り替えの間隔（use-auto-rotate.ts の ROTATE_INTERVAL_MS） */
const INTERVAL = 6000;

function Rotator({ count }: { count: number }) {
  const { index, hoverHandlers } = useAutoRotate(count, { paused: false });
  return (
    <div data-testid="area" {...hoverHandlers}>
      {index}
    </div>
  );
}

function current() {
  return screen.getByTestId("area").textContent;
}

beforeEach(() => {
  vi.useFakeTimers();
  // 「視差効果を減らす」は無効（自動で切り替わる）
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
  // jsdom にはない。マウスの位置には常にこの要素があるとみなす（詳細を閉じたときの判定し直しで使う）
  document.elementFromPoint = vi.fn(() => screen.queryByTestId("area"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useAutoRotate のタッチでの停止（#120）", () => {
  test("触らなければ 6 秒ごとに次へ進む", () => {
    render(<Rotator count={3} />);
    act(() => vi.advanceTimersByTime(INTERVAL));
    expect(current()).toBe("1");
    act(() => vi.advanceTimersByTime(INTERVAL));
    expect(current()).toBe("2");
  });

  test("タッチすると 15 秒は替わらず、過ぎたらまた 6 秒ごとに進む", () => {
    render(<Rotator count={3} />);
    act(() => vi.advanceTimersByTime(INTERVAL - 1000));
    fireEvent.pointerDown(screen.getByTestId("area"), { pointerType: "touch" });

    act(() => vi.advanceTimersByTime(TOUCH_PAUSE_MS - 1));
    expect(current()).toBe("0");

    // 止めていた時間が過ぎると、そこから 6 秒数え直す（act の中で次のタイマーが置かれる）
    act(() => vi.advanceTimersByTime(1));
    act(() => vi.advanceTimersByTime(INTERVAL - 1));
    expect(current()).toBe("0");
    act(() => vi.advanceTimersByTime(1));
    expect(current()).toBe("1");
  });

  test("触り直すたびに 15 秒を数え直す", () => {
    render(<Rotator count={3} />);
    const el = screen.getByTestId("area");
    fireEvent.pointerDown(el, { pointerType: "touch" });
    act(() => vi.advanceTimersByTime(TOUCH_PAUSE_MS - 1000));
    fireEvent.pointerDown(el, { pointerType: "pen" });

    act(() => vi.advanceTimersByTime(TOUCH_PAUSE_MS - 1));
    expect(current()).toBe("0");
    // act の中で止めていた時間が過ぎてから、次の 6 秒のタイマーが置かれる
    act(() => vi.advanceTimersByTime(1));
    act(() => vi.advanceTimersByTime(INTERVAL));
    expect(current()).toBe("1");
  });

  test("マウスのクリックでは止めない（ホバーの停止は乗せている間だけ）", () => {
    render(<Rotator count={3} />);
    const el = screen.getByTestId("area");
    fireEvent.pointerDown(el, { pointerType: "mouse" });
    fireEvent.pointerLeave(el, { pointerType: "mouse" });

    act(() => vi.advanceTimersByTime(INTERVAL));
    expect(current()).toBe("1");
  });

  test("マウスを乗せている間は止まり、離すと進む", () => {
    render(<Rotator count={3} />);
    const el = screen.getByTestId("area");
    fireEvent.pointerEnter(el, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(INTERVAL * 3));
    expect(current()).toBe("0");

    fireEvent.pointerLeave(el, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(INTERVAL));
    expect(current()).toBe("1");
  });
});
