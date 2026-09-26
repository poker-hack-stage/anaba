import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Spot } from "@/lib/data/spots";
import { spot } from "@/test/fixtures/planner";
import { SpotDetailDialog } from "./spot-detail-dialog";

// 口コミ欄の読み込みは確かめないので、応答を返さない fetch にしておく
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => {})),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderDetail(s: Spot) {
  render(<SpotDetailDialog spot={s} onClose={() => {}} />);
  return screen.getByRole("dialog");
}

describe("SpotDetailDialog", () => {
  test("image_path があれば写真を、詳細の表示幅の sizes で出す", () => {
    const dialog = renderDetail({
      ...spot("hakuba", "姫川源流", "nature"),
      image_path: "/images/spots/himekawa.jpg",
    });
    const img = dialog.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toContain(
      encodeURIComponent("/images/spots/himekawa.jpg"),
    );
    expect(img?.getAttribute("sizes")).toBe("(min-width: 704px) 672px, 100vw");
  });

  test("image_path がなければプレースホルダーだけを出す", () => {
    const dialog = renderDetail(spot("hakuba", "姫川源流", "nature"));
    expect(dialog.querySelector("img")).toBeNull();
  });

  test("写真を読み込めなかったら、プレースホルダーに戻す", () => {
    const dialog = renderDetail({
      ...spot("hakuba", "姫川源流", "nature"),
      image_path: "/images/spots/missing.jpg",
    });
    fireEvent.error(dialog.querySelector("img")!);
    expect(dialog.querySelector("img")).toBeNull();
  });

  test("評価（星）と穴場度を出す", () => {
    renderDetail(spot("hakuba", "姫川源流", "nature", { rating: 4.5, gem: 4 }));
    expect(screen.getByRole("img", { name: "評価 5段階中 4.5" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "穴場度 5段階中 4" })).toBeTruthy();
  });

  test("評価・穴場度がないときは出さない", () => {
    renderDetail(
      spot("hakuba", "姫川源流", "nature", { rating: null, gem: null }),
    );
    expect(screen.queryByRole("img", { name: /5段階中/ })).toBeNull();
  });

  test("onIncludeInRoute を渡さなければ、経路に加えるボタンを出さない（「穴場を探す」など）", () => {
    renderDetail(spot("hakuba", "姫川源流", "nature"));
    expect(
      screen.queryByRole("button", {
        name: "このスポットを経路に加えて作り直す",
      }),
    ).toBeNull();
  });

  test("onIncludeInRoute を渡すと、経路に加えるボタンを出し、押すとそのスポットを渡す", () => {
    const s = spot("hakuba", "姫川源流", "nature");
    const onIncludeInRoute = vi.fn();
    render(
      <SpotDetailDialog
        spot={s}
        onClose={() => {}}
        onIncludeInRoute={onIncludeInRoute}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "このスポットを経路に加えて作り直す",
      }),
    );

    expect(onIncludeInRoute).toHaveBeenCalledWith(s);
  });

  test("開いたまま onIncludeInRoute が外れたら、ボタンを消す（閉じるときは spot が null になるまで残す）", () => {
    const s = spot("hakuba", "姫川源流", "nature");
    const name = "このスポットを経路に加えて作り直す";
    const { rerender } = render(
      <SpotDetailDialog
        spot={s}
        onClose={() => {}}
        onIncludeInRoute={vi.fn()}
      />,
    );
    screen.getByRole("button", { name });

    rerender(<SpotDetailDialog spot={s} onClose={() => {}} />);
    expect(screen.queryByRole("button", { name })).toBeNull();
  });

  test("閉じるボタンは、スクロールしても上に残る sticky の行にあり、押すと onClose を呼ぶ", () => {
    const onClose = vi.fn();
    render(
      <SpotDetailDialog
        spot={spot("hakuba", "姫川源流", "nature")}
        onClose={onClose}
      />,
    );
    const dialog = screen.getByRole("dialog");
    const close = screen.getByRole("button", { name: "閉じる" });

    // スクロールするのはダイアログ自身なので、sticky の行はその直下に置く（写真の中に置くと一緒に流れる）
    const row = close.parentElement;
    expect(row?.parentElement).toBe(dialog);
    expect(row?.className).toContain("sticky");
    expect(row?.className).toContain("top-0");

    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
