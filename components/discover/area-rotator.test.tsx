import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { AreaWithSpots } from "@/lib/data/areas";
import type { Spot } from "@/lib/data/spots";
import { AreaRotator } from "./area-rotator";
import { EMPTY_FILTER, setLastFilter } from "./filter-query";

// URL のクエリの代わり（planner-form.test.tsx と同じ）。history.replaceState で書いたクエリを useSearchParams で読み返す
const query = vi.hoisted(() => {
  let search = "";
  const listeners = new Set<() => void>();
  return {
    get: () => search,
    set(next: string) {
      search = next.replace(/^[^?]*\??/, "");
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
});

vi.mock("next/navigation", async () => {
  const { useMemo, useSyncExternalStore } = await import("react");
  return {
    useSearchParams: () => {
      const search = useSyncExternalStore(query.subscribe, query.get);
      return useMemo(() => new URLSearchParams(search), [search]);
    },
  };
});

// 地図（Leaflet）は jsdom では描けないので、表示中の地域名だけ出す
vi.mock("./area-map", () => ({
  AreaMap: ({ area }: { area?: AreaWithSpots }) => (
    <div data-testid="map">{area?.name ?? "日本全体"}</div>
  ),
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

function area(id: string, name: string, spots: Spot[]): AreaWithSpots {
  return {
    id,
    name,
    prefecture: "長野県",
    catchphrase: null,
    center_lat: 36.2,
    center_lng: 137.9,
    zoom: 11,
    boundary: null,
    display_order: 0,
    image_path: null,
    created_at: "2026-09-25T00:00:00Z",
    updated_at: "2026-09-25T00:00:00Z",
    spots,
    recommended: spots.slice(0, 3),
  };
}

const areas: AreaWithSpots[] = [
  area("hakuba", "白馬村", [
    spot("hakuba", "白馬八方温泉", "onsen"),
    spot("hakuba", "八方池", "view"),
  ]),
  area("matsumoto", "松本市", [spot("matsumoto", "松本城", "history")]),
  area("omachi", "大町市", [spot("omachi", "葛温泉", "onsen")]),
];

/** 前へ／次へのドットの地域名（AreaNav） */
function navAreas() {
  return screen
    .queryAllByRole("button", { name: /^(白馬村|松本市|大町市)$/ })
    .map((button) => button.getAttribute("aria-label"));
}

function currentArea() {
  return screen.getByTestId("map").textContent;
}

function searchBox() {
  return screen.getByRole<HTMLInputElement>("searchbox");
}

beforeEach(() => {
  vi.useFakeTimers();
  query.set("");
  // lastFilter はモジュールの変数なので、テストをまたいで残らないように戻す
  setLastFilter(EMPTY_FILTER);
  vi.spyOn(window.history, "replaceState").mockImplementation(
    (_data, _unused, url) => query.set(String(url ?? "")),
  );
  // 「視差効果を減らす」にして、自動の切り替えを止める（切り替えのテストは use-auto-rotate の範囲）
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AreaRotator の絞り込み（#50）", () => {
  test("カテゴリで絞ると、一致した地域だけを巡回し、件数を出す", () => {
    render(<AreaRotator areas={areas} />);
    expect(navAreas()).toEqual(["白馬村", "松本市", "大町市"]);

    fireEvent.click(screen.getByRole("button", { name: "温泉・銭湯" }));

    expect(navAreas()).toEqual(["白馬村", "大町市"]);
    expect(screen.getByText("2地域・2件が見つかりました")).toBeTruthy();
    expect(query.get()).toBe("cat=onsen");
  });

  test("入力は 300ms 経つまで URL に書かない", () => {
    render(<AreaRotator areas={areas} />);

    fireEvent.change(searchBox(), { target: { value: "温泉" } });
    act(() => vi.advanceTimersByTime(299));
    expect(query.get()).toBe("");

    act(() => vi.advanceTimersByTime(1));
    expect(new URLSearchParams(query.get()).get("q")).toBe("温泉");
    expect(navAreas()).toEqual(["白馬村", "大町市"]);
  });

  test("IME の変換中は URL に書かず、確定してから 300ms で書く", () => {
    render(<AreaRotator areas={areas} />);
    const input = searchBox();

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "おんせ" } });
    act(() => vi.advanceTimersByTime(600));
    expect(query.get()).toBe("");
    expect(
      screen.queryByText("条件に合う穴場が見つかりませんでした"),
    ).toBeNull();

    fireEvent.change(input, { target: { value: "温泉" } });
    fireEvent.compositionEnd(input);
    act(() => vi.advanceTimersByTime(300));
    expect(new URLSearchParams(query.get()).get("q")).toBe("温泉");
  });

  test("0件なら空状態を出し、「条件をクリア」で全地域に戻して検索欄にフォーカスする", () => {
    query.set("?q=存在しない");
    render(<AreaRotator areas={areas} />);

    expect(
      screen.getByText("条件に合う穴場が見つかりませんでした"),
    ).toBeTruthy();
    expect(screen.getByText("0地域・0件が見つかりました")).toBeTruthy();
    expect(currentArea()).toBe("日本全体");

    // 空状態のボタン（件数の横にもある）
    const buttons = screen.getAllByRole("button", { name: "条件をクリア" });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1]);

    expect(query.get()).toBe("");
    expect(navAreas()).toEqual(["白馬村", "松本市", "大町市"]);
    expect(searchBox().value).toBe("");
    expect(document.activeElement).toBe(searchBox());
  });

  test("件数の横の「条件をクリア」でも、検索欄にフォーカスを戻す", () => {
    query.set("?cat=onsen");
    render(<AreaRotator areas={areas} />);

    fireEvent.click(screen.getByRole("button", { name: "条件をクリア" }));

    expect(query.get()).toBe("");
    expect(document.activeElement).toBe(searchBox());
  });

  test("タブから戻って URL にクエリがないときは最後の条件を戻し、クリアした条件は戻さない", () => {
    const { unmount } = render(<AreaRotator areas={areas} />);
    fireEvent.click(screen.getByRole("button", { name: "温泉・銭湯" }));
    unmount();

    // 「AI旅プラン」タブへ行って戻る（URL のクエリはなくなる）
    query.set("");
    const second = render(<AreaRotator areas={areas} />);
    expect(query.get()).toBe("cat=onsen");
    expect(navAreas()).toEqual(["白馬村", "大町市"]);

    fireEvent.click(screen.getByRole("button", { name: "条件をクリア" }));
    second.unmount();

    query.set("");
    render(<AreaRotator areas={areas} />);
    expect(query.get()).toBe("");
    expect(navAreas()).toEqual(["白馬村", "松本市", "大町市"]);
  });

  test("検索欄にフォーカスがある間は、URL のキーワードを検索欄に写さない", () => {
    render(<AreaRotator areas={areas} />);
    const input = searchBox();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "温" } });

    act(() => query.set("?q=外から"));
    expect(input.value).toBe("温");

    fireEvent.blur(input);
    act(() => query.set("?q=松本"));
    expect(input.value).toBe("松本");
  });

  test("条件が変わったら先頭の地域に戻す。キーワードの前後の空白だけなら戻さない", () => {
    query.set("?q=長野");
    render(<AreaRotator areas={areas} />);
    fireEvent.click(screen.getByRole("button", { name: "次の地域" }));
    expect(currentArea()).toBe("松本市");

    fireEvent.change(searchBox(), { target: { value: "長野 " } });
    act(() => vi.advanceTimersByTime(300));
    expect(new URLSearchParams(query.get()).get("q")).toBe("長野 ");
    expect(currentArea()).toBe("松本市");

    fireEvent.click(screen.getByRole("button", { name: "温泉・銭湯" }));
    expect(currentArea()).toBe("白馬村");
  });
});
