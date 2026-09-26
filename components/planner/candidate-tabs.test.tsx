import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";

import type { Spot } from "@/lib/data/spots";
import type { PlanCandidate } from "@/lib/planner/types";
import { CandidateTabs } from "./candidate-tabs";

function spot(areaName: string, name: string): Spot {
  return {
    id: `${areaName}/${name}`,
    area_id: areaName,
    name,
    category: "nature",
    lat: 36.2,
    lng: 137.9,
    rating: 4.0,
    hidden_gem_score: null,
    stay_minutes: 60,
    catchphrase: null,
    description: null,
    local_tip: null,
    best_time: null,
    image_path: null,
    tags: [],
    source: "seed",
    status: "published",
    nickname: null,
    created_at: "2026-09-25T00:00:00Z",
    updated_at: "2026-09-25T00:00:00Z",
  };
}

function candidate(areaName: string): PlanCandidate {
  return {
    id: areaName,
    areaName,
    title: `${areaName}をめぐる日帰りプラン`,
    summary: "",
    reason: "",
    duration: "day",
    days: [
      {
        day: 1,
        areaId: areaName,
        areaName,
        route: [spot(areaName, "A"), spot(areaName, "B")],
        durationMinutes: 180,
      },
    ],
    otherSpots: [],
    nearby: false,
  };
}

const three = [candidate("松本市"), candidate("安曇野市"), candidate("大町市")];

/** 選んだ番号を持つ親の代わり（アプリでは PlannerStateProvider が持つ） */
function Tabs({
  candidates,
  onSpotClick = vi.fn(),
}: {
  candidates: PlanCandidate[];
  onSpotClick?: (spot: Spot) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  return (
    <CandidateTabs
      candidates={candidates}
      selectedIndex={selectedIndex}
      onSelect={setSelectedIndex}
      onSpotClick={onSpotClick}
    />
  );
}

function tabs() {
  return screen.getAllByRole("tab");
}

/** 表示中の候補のタイトル（描いているカードは1枚だけのはず） */
function shownTitles() {
  return screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
}

describe("CandidateTabs", () => {
  test("候補が3件なら、タブを3つ出し、1件目のカードだけを描く", () => {
    render(<Tabs candidates={three} />);

    expect(tabs().map((t) => t.textContent)).toEqual([
      "候補1：松本市",
      "候補2：安曇野市",
      "候補3：大町市",
    ]);
    expect(tabs().map((t) => t.getAttribute("aria-selected"))).toEqual([
      "true",
      "false",
      "false",
    ]);
    expect(shownTitles()).toEqual(["松本市をめぐる日帰りプラン"]);

    const panel = screen.getByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(tabs()[0].id);
    expect(tabs()[0].getAttribute("aria-controls")).toBe(panel.id);
  });

  test("タブを押すと、その候補に切り替わる", () => {
    render(<Tabs candidates={three} />);

    fireEvent.click(screen.getByRole("tab", { name: /安曇野市/ }));

    expect(shownTitles()).toEqual(["安曇野市をめぐる日帰りプラン"]);
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(
      tabs()[1].id,
    );
  });

  test("選んだタブだけを Tab で移動できる（ほかのタブは tabIndex -1）", () => {
    render(<Tabs candidates={three} />);

    expect(tabs().map((t) => t.tabIndex)).toEqual([0, -1, -1]);
  });

  test("←→ で隣の候補に切り替わり、端ではもう一方の端に回る", () => {
    render(<Tabs candidates={three} />);

    fireEvent.keyDown(tabs()[0], { key: "ArrowRight" });
    expect(shownTitles()).toEqual(["安曇野市をめぐる日帰りプラン"]);
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs().map((t) => t.tabIndex)).toEqual([-1, 0, -1]);

    fireEvent.keyDown(tabs()[1], { key: "ArrowLeft" });
    fireEvent.keyDown(tabs()[0], { key: "ArrowLeft" });
    expect(shownTitles()).toEqual(["大町市をめぐる日帰りプラン"]);
    expect(document.activeElement).toBe(tabs()[2]);

    fireEvent.keyDown(tabs()[2], { key: "ArrowRight" });
    expect(shownTitles()).toEqual(["松本市をめぐる日帰りプラン"]);
  });

  test("Home・End で先頭・末尾の候補に切り替わる", () => {
    render(<Tabs candidates={three} />);

    fireEvent.keyDown(tabs()[0], { key: "End" });
    expect(shownTitles()).toEqual(["大町市をめぐる日帰りプラン"]);
    expect(document.activeElement).toBe(tabs()[2]);

    fireEvent.keyDown(tabs()[2], { key: "Home" });
    expect(shownTitles()).toEqual(["松本市をめぐる日帰りプラン"]);
    expect(document.activeElement).toBe(tabs()[0]);
  });

  test("候補が1件なら、タブを出さずにカードだけ出す", () => {
    render(
      <CandidateTabs
        candidates={[candidate("松本市")]}
        selectedIndex={0}
        onSelect={vi.fn()}
        onSpotClick={vi.fn()}
      />,
    );

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("tabpanel")).toBeNull();
    expect(shownTitles()).toEqual(["松本市をめぐる日帰りプラン"]);
  });

  test("選んだ番号が候補の数より大きければ、最後の候補を出す", () => {
    render(
      <CandidateTabs
        candidates={[candidate("白馬村"), candidate("池田町")]}
        selectedIndex={2}
        onSelect={vi.fn()}
        onSpotClick={vi.fn()}
      />,
    );

    expect(tabs().map((t) => t.getAttribute("aria-selected"))).toEqual([
      "false",
      "true",
    ]);
    expect(shownTitles()).toEqual(["池田町をめぐる日帰りプラン"]);
  });

  test("カードには「候補 n」を出さない（タブに出している）", () => {
    render(<Tabs candidates={three} />);

    expect(screen.getByRole("tabpanel").textContent).not.toContain("候補");
  });

  test("カードのスポット名を押すと、そのスポットを渡す", () => {
    const onSpotClick = vi.fn();
    render(<Tabs candidates={three} onSpotClick={onSpotClick} />);

    // 経路のカードは全体が1つのボタンで、名前はスポット名から始まる（#138）
    fireEvent.click(screen.getAllByRole("button", { name: /^B/ })[0]);

    expect(onSpotClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "松本市/B" }),
    );
  });
});
