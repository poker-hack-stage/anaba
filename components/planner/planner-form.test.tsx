import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Spot } from "@/lib/data/spots";
import type { PlannableArea } from "@/lib/planner/generate";
import type { PlanResponse } from "@/lib/planner/types";
import { PlannerForm } from "./planner-form";
import { PlannerStateProvider } from "./planner-state";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

function spot(areaId: string, name: string, category: string): Spot {
  return {
    id: `${areaId}/${name}`,
    area_id: areaId,
    name,
    category,
    lat: 36.2,
    lng: 137.9,
    rating: 4.0,
    stay_minutes: 60,
    catchphrase: null,
    description: null,
    local_tip: null,
    best_time: null,
    image_path: null,
    tags: [],
    created_at: "2026-09-25T00:00:00Z",
    updated_at: "2026-09-25T00:00:00Z",
  };
}

const areas: PlannableArea[] = [
  {
    id: "matsumoto",
    name: "松本市",
    catchphrase: null,
    center_lat: 36.238,
    center_lng: 137.972,
    spots: [
      spot("matsumoto", "松本城", "history"),
      spot("matsumoto", "浅間温泉", "onsen"),
      spot("matsumoto", "美ヶ原", "view"),
    ],
  },
];

function renderForm() {
  render(
    <PlannerStateProvider>
      <PlannerForm areas={areas} />
    </PlannerStateProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "絞る" }));
}

beforeEach(() => {
  vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PlannerForm", () => {
  test("/api/plan が失敗したら、ブラウザでデモモードの候補を出す", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    renderForm();

    // 見つからなければ findByText が失敗する
    await screen.findByText("松本市をめぐる日帰りプラン");
    expect(screen.getByRole("status").textContent).toContain(
      "デモモードで作成しました",
    );
  });

  test("/api/plan がエラーを返したときも、デモモードの候補を出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 500 })),
    );

    renderForm();

    // 見つからなければ findByText が失敗する
    await screen.findByText("松本市をめぐる日帰りプラン");
  });

  test("Gemini で作った候補なら、デモモードの表示を出さない", async () => {
    const body: PlanResponse = { candidates: [], mode: "ai" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));

    renderForm();

    // 見つからなければ findByText が失敗する
    await screen.findByText("この条件では候補を組めませんでした");
    expect(screen.queryByText(/デモモードで作成しました/)).toBeNull();
  });
});
