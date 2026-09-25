import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { spot } from "@/test/fixtures/planner";
import { SpotCard } from "./spot-card";

describe("SpotCard", () => {
  test("名前・カテゴリ・評価（星）・穴場度・タグを出す", () => {
    render(
      <SpotCard
        spot={{
          ...spot("hakuba", "姫川源流", "nature", { rating: 4.5, gem: 4 }),
          tags: ["湧き水", "散策", "静か", "4件目"],
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "姫川源流" })).toBeTruthy();
    expect(screen.getByText("自然・散策")).toBeTruthy();
    expect(screen.getByRole("img", { name: "評価 5段階中 4.5" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "穴場度 5段階中 4" })).toBeTruthy();
    expect(screen.getByText("#湧き水")).toBeTruthy();
    expect(screen.queryByText("#4件目")).toBeNull();
  });

  test("評価・穴場度がないときは出さない", () => {
    render(
      <SpotCard
        spot={spot("hakuba", "姫川源流", "nature", { rating: null, gem: null })}
      />,
    );
    expect(screen.queryByRole("img", { name: /5段階中/ })).toBeNull();
  });

  test("クリックするとそのスポットで onSelect を呼ぶ（詳細を開く）", () => {
    const onSelect = vi.fn();
    const s = spot("hakuba", "姫川源流", "nature");
    render(<SpotCard spot={s} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(s);
  });
});
