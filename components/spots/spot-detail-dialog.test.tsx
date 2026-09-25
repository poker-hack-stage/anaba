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
});
