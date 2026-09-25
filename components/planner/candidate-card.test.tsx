import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type { Spot } from "@/lib/data/spots";
import { spot as fixtureSpot } from "@/test/fixtures/planner";
import type { PlanCandidate, PlanDay } from "@/lib/planner/types";
import { CandidateCard } from "./candidate-card";

/** 名前を id に使うスポット（地域は使わないので固定） */
function spot(name: string, stay: number | null = 60): Spot {
  return fixtureSpot("area", name, "nature", { stay });
}

function day(
  n: number,
  areaName: string,
  route: Spot[],
  minutes: number,
): PlanDay {
  return {
    day: n,
    areaId: areaName,
    areaName,
    route,
    durationMinutes: minutes,
  };
}

function candidate(overrides: Partial<PlanCandidate> = {}): PlanCandidate {
  return {
    id: "安曇野市",
    areaName: "安曇野市",
    title: "安曇野の湧き水めぐり",
    summary: "わさび田と湧き水の町を歩きます。",
    reason: "興味の「自然」に合うスポットを選びました。",
    duration: "day",
    days: [day(1, "安曇野市", [spot("わさび田"), spot("湧き水")], 240)],
    otherSpots: [],
    nearby: false,
    ...overrides,
  };
}

function renderCard(c: PlanCandidate, onSpotClick = vi.fn()) {
  render(<CandidateCard candidate={c} onSpotClick={onSpotClick} />);
  return onSpotClick;
}

describe("CandidateCard", () => {
  test("タイトル・説明・選ばれた理由を出す", () => {
    renderCard(candidate());

    screen.getByText("安曇野の湧き水めぐり");
    screen.getByText("わさび田と湧き水の町を歩きます。");
    screen.getByText("興味の「自然」に合うスポットを選びました。");
  });

  test("日帰りは、地域と所要時間の見出しの下に、めぐる順の番号付きのリストを出す", () => {
    renderCard(candidate());

    const heading = screen.getByRole("heading", { level: 4 });
    expect(heading.textContent).toContain("安曇野市");
    expect(heading.textContent).toContain("約4時間");
    expect(heading.textContent).not.toContain("1日目");

    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "1わさび田滞在の目安 約1時間",
      "2湧き水滞在の目安 約1時間",
    ]);
    expect(screen.queryByText(/宿は含みません/)).toBeNull();
  });

  test("複数日は日ごとに見出しを出し、番号は日ごとに1から数える", () => {
    renderCard(
      candidate({
        duration: "1n2d",
        days: [
          day(1, "安曇野市", [spot("わさび田"), spot("湧き水")], 240),
          day(2, "松本市", [spot("城"), spot("温泉")], 270),
        ],
      }),
    );

    const headings = screen.getAllByRole("heading", { level: 4 });
    expect(headings.map((h) => h.textContent)).toEqual([
      "1日目・安曇野市・所要時間の目安約4時間",
      "2日目・松本市・所要時間の目安約4時間半",
    ]);

    const secondDay = headings[1].closest("section")!;
    expect(
      within(secondDay)
        .getAllByRole("listitem")
        .map((li) => li.textContent?.[0]),
    ).toEqual(["1", "2"]);
    screen.getByText(/宿は含みません/);
  });

  test("滞在の目安がないスポットは、滞在の目安を出さない", () => {
    renderCard(
      candidate({
        days: [
          day(1, "安曇野市", [spot("わさび田", null), spot("湧き水", 45)], 150),
        ],
      }),
    );

    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(
      ["1わさび田", "2湧き水滞在の目安 約45分"],
    );
  });

  test("近くの地域の候補には「近くの地域」のバッジを出す", () => {
    renderCard(candidate({ nearby: true }));
    screen.getByText("近くの地域");
  });

  test("選んだ地域の候補には「近くの地域」のバッジを出さない", () => {
    renderCard(candidate());
    expect(screen.queryByText("近くの地域")).toBeNull();
  });

  test("スポット名を押すと、そのスポットを渡す", () => {
    const onSpotClick = renderCard(candidate());

    fireEvent.click(screen.getByRole("button", { name: "湧き水" }));

    expect(onSpotClick).toHaveBeenCalledWith(
      expect.objectContaining({ name: "湧き水" }),
    );
  });
});
