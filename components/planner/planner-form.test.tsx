import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Spot } from "@/lib/data/spots";
import type { PlannableArea } from "@/lib/planner/generate";
import type { PlanResponse } from "@/lib/planner/types";
import { PlannerForm } from "./planner-form";
import { PlannerStateProvider } from "./planner-state";

// URL のクエリの代わり。フォームが history.replaceState で書いたクエリを、useSearchParams で読み返せるようにする
// （本物の Next.js も、replaceState を useSearchParams に反映する）
const query = vi.hoisted(() => {
  let search = "";
  const listeners = new Set<() => void>();
  return {
    get: () => search,
    set(next: string) {
      search = next.replace(/^\?/, "");
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
    created_at: "2026-09-25T00:00:00Z",
    updated_at: "2026-09-25T00:00:00Z",
  };
}

const areas: PlannableArea[] = [
  {
    id: "matsumoto",
    name: "松本市",
    prefecture: "長野県",
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

function renderForm({ submit = true } = {}) {
  render(
    <PlannerStateProvider>
      <PlannerForm areas={areas} />
    </PlannerStateProvider>,
  );
  if (submit) fireEvent.click(screen.getByRole("button", { name: "絞る" }));
}

/** fetch に送った本文 */
function sentBody(fetchMock: ReturnType<typeof vi.fn>) {
  return JSON.parse(fetchMock.mock.calls[0][1].body);
}

beforeEach(() => {
  query.set("");
  vi.spyOn(window.history, "replaceState").mockImplementation(
    (_data, _unused, url) => query.set(String(url ?? "")),
  );
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

  describe("条件の送り方（#17）", () => {
    function stubFetch() {
      const body: PlanResponse = { candidates: [], mode: "ai" };
      const fetchMock = vi.fn().mockResolvedValue(Response.json(body));
      vi.stubGlobal("fetch", fetchMock);
      return fetchMock;
    }

    test("何も選ばなければ、既定値（おまかせ・日帰り）で送る", async () => {
      const fetchMock = stubFetch();

      renderForm();
      await screen.findByText("この条件では候補を組めませんでした");

      expect(sentBody(fetchMock)).toEqual({
        areaId: null,
        duration: "day",
        interests: [],
        companion: "ひとり",
        transport: "車",
      });
    });

    test("地域は id で、日程はコードで送る", async () => {
      const fetchMock = stubFetch();
      renderForm({ submit: false });

      fireEvent.change(screen.getByLabelText("エリア"), {
        target: { value: "matsumoto" },
      });
      fireEvent.click(screen.getByRole("button", { name: "1泊2日" }));
      fireEvent.click(screen.getByRole("button", { name: "温泉" }));
      fireEvent.click(screen.getByRole("button", { name: "絞る" }));
      await screen.findByText("この条件では候補を組めませんでした");

      expect(sentBody(fetchMock)).toMatchObject({
        areaId: "matsumoto",
        duration: "1n2d",
        interests: ["温泉"],
      });
      expect(query.get()).toContain("area=matsumoto");
      expect(query.get()).toContain("duration=1n2d");
    });

    test("地域を選ぶと「おまかせ」が外れ、「おまかせ」を押すと地域の選択が外れる", () => {
      renderForm({ submit: false });
      const select = screen.getByLabelText<HTMLSelectElement>("エリア");
      const any = screen.getByRole("button", { name: "おまかせ" });
      expect(any.getAttribute("aria-pressed")).toBe("true");

      fireEvent.change(select, { target: { value: "matsumoto" } });
      expect(any.getAttribute("aria-pressed")).toBe("false");
      expect(select.value).toBe("matsumoto");

      fireEvent.click(any);
      expect(any.getAttribute("aria-pressed")).toBe("true");
      expect(select.value).toBe("");
    });

    test("地域は都道府県ごとの optgroup にまとめる", () => {
      renderForm({ submit: false });
      const select = screen.getByLabelText<HTMLSelectElement>("エリア");

      const groups = [...select.querySelectorAll("optgroup")];
      expect(groups.map((g) => g.label)).toEqual(["長野県"]);
      expect(
        [...groups[0].querySelectorAll("option")].map((o) => o.textContent),
      ).toEqual(["松本市"]);
    });

    test("URL のクエリの条件を読む", () => {
      query.set("?area=matsumoto&duration=2n3d&companion=友人&transport=車");
      renderForm({ submit: false });

      expect(screen.getByLabelText<HTMLSelectElement>("エリア").value).toBe(
        "matsumoto",
      );
      expect(
        screen
          .getByRole("button", { name: "2泊3日" })
          .getAttribute("aria-pressed"),
      ).toBe("true");
    });

    test("URL のクエリの知らない地域・日程は、おまかせ・日帰りにする", () => {
      query.set("?area=unknown&duration=9n10d&companion=友人&transport=車");
      renderForm({ submit: false });

      expect(screen.getByLabelText<HTMLSelectElement>("エリア").value).toBe("");
      expect(
        screen
          .getByRole("button", { name: "日帰り" })
          .getAttribute("aria-pressed"),
      ).toBe("true");
    });
  });
});
