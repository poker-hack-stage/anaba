import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type { Spot } from "@/lib/data/spots";
import { spot as fixtureSpot } from "@/test/fixtures/planner";
import type { PlanCandidate, PlanDay } from "@/lib/planner/types";
import type { SpotMapProps } from "@/components/map/spot-map";
import { CandidateCard } from "./candidate-card";
import { getDayColor } from "./day-colors";

// 地図（MapLibre）は jsdom で描けないので、渡された経路を文字で出し、ピンをボタンで出す部品に差し替える
vi.mock("@/components/map/spot-map", () => ({
  SpotMap: ({
    routes = [],
    others = [],
    onSpotClick,
    cooperativeGestures = true,
  }: SpotMapProps) => (
    <div
      role="group"
      aria-label="地図の経路"
      data-cooperative={String(cooperativeGestures)}
    >
      {routes.map((r, i) => (
        <p key={i}>
          {[r.name ?? "（名前なし）", r.color ?? "（既定の色）"]
            .concat(r.spots.map((s) => s.name))
            .join(" / ")}
        </p>
      ))}
      {[...routes.flatMap((r) => r.spots), ...others].map((s) => (
        <button key={s.id} type="button" onClick={() => onSpotClick?.(s)}>
          ピン {s.name}
        </button>
      ))}
    </div>
  ),
}));

/** 地図の経路の表示（mock の文字）を、上から順に返す */
function routeTexts(map: HTMLElement) {
  return [...map.querySelectorAll("p")].map((p) => p.textContent);
}

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
      expect.stringMatching(/^1わさび田滞在の目安 約1時間/),
      expect.stringMatching(/^2湧き水滞在の目安 約1時間/),
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

  test("日帰りの地図は、1本の経路を既定の色で出す（凡例の名前を付けない）", async () => {
    renderCard(candidate());

    const routes = await screen.findByRole("group", { name: "地図の経路" });
    expect([...routes.querySelectorAll("p")].map((p) => p.textContent)).toEqual(
      ["（名前なし） / （既定の色） / わさび田 / 湧き水"],
    );
  });

  test("複数日の地図は、日ごとの経路を日の見出しと同じ色・名前で出す", async () => {
    renderCard(
      candidate({
        duration: "1n2d",
        days: [
          day(1, "安曇野市", [spot("わさび田"), spot("湧き水")], 240),
          day(2, "松本市", [spot("城"), spot("縄手通り")], 180),
        ],
      }),
    );

    const routes = await screen.findByRole("group", { name: "地図の経路" });
    expect([...routes.querySelectorAll("p")].map((p) => p.textContent)).toEqual(
      [
        `1日目 / ${getDayColor(1).hex} / わさび田 / 湧き水`,
        `2日目 / ${getDayColor(2).hex} / 城 / 縄手通り`,
      ],
    );
    // 見出しの文字も同じ日の色
    expect(screen.getByText("2日目").closest("h4")?.className).toContain(
      getDayColor(2).text,
    );
  });

  test("滞在の目安がないスポットは、滞在の目安を出さない", () => {
    renderCard(
      candidate({
        days: [
          day(1, "安曇野市", [spot("わさび田", null), spot("湧き水", 45)], 150),
        ],
      }),
    );

    const [first, second] = screen.getAllByRole("listitem");
    expect(first.textContent).toMatch(/^1わさび田/);
    expect(first.textContent).not.toContain("滞在の目安");
    expect(second.textContent).toMatch(/^2湧き水滞在の目安 約45分/);
  });

  test("近くの地域の候補には「近くの地域」のバッジを出す", () => {
    renderCard(candidate({ nearby: true }));
    screen.getByText("近くの地域");
  });

  test("選んだ地域の候補には「近くの地域」のバッジを出さない", () => {
    renderCard(candidate());
    expect(screen.queryByText("近くの地域")).toBeNull();
  });

  describe("経路のスポットのカード", () => {
    function richSpot(overrides: Partial<Spot> = {}): Spot {
      return {
        ...fixtureSpot("area", "湯小屋", "onsen", { rating: 4.5, gem: 4 }),
        catchphrase: "地元の人が通う小さな湯",
        image_path: "/images/spots/yu.jpg",
        ...overrides,
      };
    }

    function routeCard(s: Spot) {
      renderCard(candidate({ days: [day(1, "安曇野市", [s], 60)] }));
      return within(screen.getByRole("listitem"));
    }

    test("写真・名前・カテゴリ・評価・穴場度・キャッチコピー・滞在の目安を出す", () => {
      const card = routeCard(richSpot());

      card.getByText("湯小屋");
      card.getByText("温泉・銭湯");
      card.getByRole("img", { name: "評価 5段階中 4.5" });
      card.getByRole("img", { name: "穴場度 5段階中 4" });
      card.getByText("地元の人が通う小さな湯");
      card.getByText("約1時間");

      // 写真は小さく読み込む（next/image の sizes を表示幅にする）
      const img = screen.getByRole("listitem").querySelector("img");
      expect(img?.getAttribute("src")).toContain(
        encodeURIComponent("/images/spots/yu.jpg"),
      );
      expect(img?.getAttribute("sizes")).toBe("64px");
    });

    test("写真がなければ写真を出さない（カテゴリのイラストだけ）", () => {
      routeCard(richSpot({ image_path: null }));
      expect(screen.getByRole("listitem").querySelector("img")).toBeNull();
      // イラストは lucide のアイコン（svg）
      expect(screen.getByRole("listitem").querySelector("svg")).not.toBeNull();
    });

    test("AI の画像は、画像に重ねずバッジの並びに「イメージ（AI で生成）」を1つだけ出す", () => {
      const card = routeCard(
        richSpot({ image_path: "/images/spots/ai/yu.jpg" }),
      );
      const labels = card.getAllByText("イメージ（AI で生成）");
      expect(labels).toHaveLength(1);
      expect(labels[0].closest(".rounded-full")).not.toBeNull();
    });

    test("写真には「イメージ（AI で生成）」を出さない", () => {
      const card = routeCard(richSpot());
      expect(card.queryByText("イメージ（AI で生成）")).toBeNull();
    });

    test("評価・穴場度・キャッチコピーがなければ出さない", () => {
      const card = routeCard(
        richSpot({ rating: null, hidden_gem_score: null, catchphrase: null }),
      );
      expect(card.queryByRole("img", { name: /5段階中/ })).toBeNull();
      expect(card.queryByText("地元の人が通う小さな湯")).toBeNull();
    });

    test("ボタンの中は phrasing content だけ（div・p・見出しを入れない）", () => {
      routeCard(richSpot());
      const button = screen.getByRole("button", { name: /^湯小屋/ });
      expect(button.querySelector("div, p, h1, h2, h3, h4, h5, h6")).toBeNull();
    });

    test("カード全体が1つのボタンで、押すとそのスポットを渡す", () => {
      const onSpotClick = renderCard(candidate());

      const button = screen.getByRole("button", { name: /^湧き水/ });
      // キーボードで押せるよう、ネイティブの button にする
      expect(button.tagName).toBe("BUTTON");
      expect(button.textContent).toContain("自然・散策");
      fireEvent.click(button);

      expect(onSpotClick).toHaveBeenCalledWith(
        expect.objectContaining({ name: "湧き水" }),
      );
    });
  });

  describe("大きな地図", () => {
    const twoDays = () =>
      candidate({
        duration: "1n2d",
        days: [
          day(1, "安曇野市", [spot("わさび田"), spot("湧き水")], 240),
          day(2, "松本市", [spot("城"), spot("縄手通り")], 180),
        ],
        otherSpots: [spot("美術館")],
      });

    async function openLargeMap() {
      fireEvent.click(screen.getByRole("button", { name: "地図を大きく見る" }));
      const dialog = await screen.findByRole("dialog", {
        name: "安曇野の湧き水めぐり",
      });
      const map = await within(dialog).findByRole("group", {
        name: "地図の経路",
      });
      return { dialog, map };
    }

    test("カードの地図はページのスクロールを優先し、大きな地図は1本指・ホイールで動かせる", async () => {
      renderCard(twoDays());
      const cardMap = await screen.findByRole("group", { name: "地図の経路" });
      expect(cardMap.dataset.cooperative).toBe("true");

      const { map } = await openLargeMap();
      expect(map.dataset.cooperative).toBe("false");
    });

    test("はじめは開いていない", () => {
      renderCard(candidate());
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    test("拡大ボタンで開き、カードと同じ日ごとの経路・色・経路外のスポットを出す", async () => {
      renderCard(twoDays());
      const cardMap = await screen.findByRole("group", { name: "地図の経路" });

      const { map } = await openLargeMap();

      expect(routeTexts(map)).toEqual(routeTexts(cardMap));
      expect(routeTexts(map)).toEqual([
        `1日目 / ${getDayColor(1).hex} / わさび田 / 湧き水`,
        `2日目 / ${getDayColor(2).hex} / 城 / 縄手通り`,
      ]);
      within(map).getByRole("button", { name: "ピン 美術館" });
    });

    test("日帰りは、カードと同じく1本の経路を既定の色で出す", async () => {
      renderCard(candidate());

      const { map } = await openLargeMap();

      expect(routeTexts(map)).toEqual([
        "（名前なし） / （既定の色） / わさび田 / 湧き水",
      ]);
    });

    test("Esc で閉じ、フォーカスを拡大ボタンに戻す", async () => {
      renderCard(candidate());
      const { dialog } = await openLargeMap();

      fireEvent.keyDown(dialog, { key: "Escape" });

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "地図を大きく見る" }),
      );
    });

    test("閉じるボタンで閉じ、フォーカスを拡大ボタンに戻す", async () => {
      renderCard(candidate());
      const { dialog } = await openLargeMap();

      fireEvent.click(within(dialog).getByRole("button", { name: "閉じる" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "地図を大きく見る" }),
      );
    });

    test("ピンを押すと、カードと同じくそのスポットを渡す", async () => {
      const onSpotClick = renderCard(twoDays());
      const { map } = await openLargeMap();

      fireEvent.click(within(map).getByRole("button", { name: "ピン 城" }));

      expect(onSpotClick).toHaveBeenCalledWith(
        expect.objectContaining({ name: "城" }),
      );
    });
  });
});
