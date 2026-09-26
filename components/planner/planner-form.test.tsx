import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { SpotMapProps } from "@/components/map/spot-map";
import type { Spot } from "@/lib/data/spots";
import { generateCandidates, type PlannableArea } from "@/lib/planner/generate";
import type { PlanConditions, PlanResponse } from "@/lib/planner/types";
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

// 地図（MapLibre）は jsdom で描けないので、経路外のスポット（小さなピン）をボタンで出す部品に差し替える
vi.mock("@/components/map/spot-map", () => ({
  SpotMap: ({ others = [], onSpotClick }: SpotMapProps) => (
    <div role="group" aria-label="地図">
      {others.map((s) => (
        <button key={s.id} type="button" onClick={() => onSpotClick?.(s)}>
          経路外のピン: {s.name}
        </button>
      ))}
    </div>
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

function renderForm({
  submit = true,
  areas: plannable = areas,
}: { submit?: boolean; areas?: PlannableArea[] } = {}) {
  render(
    <PlannerStateProvider>
      <PlannerForm areas={plannable} />
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

  test("/api/plan が 429（レート制限）なら、デモモードの候補と理由を出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: "rate_limited" }, { status: 429 }),
        ),
    );

    renderForm();

    // 見つからなければ findByText が失敗する
    await screen.findByText("松本市をめぐる日帰りプラン");
    expect(screen.getByRole("status").textContent).toContain(
      "短い時間に何度も作ったため、デモモードで作成しました",
    );
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
      ).toEqual(["松本市（長野県）"]);
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

  describe("自由記述の希望（#114）", () => {
    function stubFetch() {
      const body: PlanResponse = { candidates: [], mode: "ai" };
      const fetchMock = vi.fn().mockResolvedValue(Response.json(body));
      vi.stubGlobal("fetch", fetchMock);
      return fetchMock;
    }
    const noteField = () =>
      screen.getByLabelText<HTMLTextAreaElement>("ほかに希望があれば（任意）");

    test("入力中は URL を書き換えず、フォーカスが外れたときに書く", () => {
      renderForm({ submit: false });
      const replaceState = vi.mocked(window.history.replaceState);
      replaceState.mockClear();

      fireEvent.change(noteField(), { target: { value: "雨" } });
      fireEvent.change(noteField(), { target: { value: "雨でも\n楽しめる" } });
      expect(replaceState).not.toHaveBeenCalled();
      expect(noteField().value).toBe("雨でも\n楽しめる");
      expect(screen.getByText("残り92文字")).toBeTruthy();

      fireEvent.blur(noteField());
      expect(replaceState).toHaveBeenCalledTimes(1);
      expect(new URLSearchParams(query.get()).get("note")).toBe(
        "雨でも 楽しめる",
      );
    });

    test("「絞る」で、入力中の希望も URL に書いて送る", async () => {
      const fetchMock = stubFetch();
      renderForm({ submit: false });

      fireEvent.change(noteField(), {
        target: { value: " ゆっくり回りたい " },
      });
      fireEvent.click(screen.getByRole("button", { name: "絞る" }));
      await screen.findByText("この条件では候補を組めませんでした");

      expect(sentBody(fetchMock)).toMatchObject({ note: "ゆっくり回りたい" });
      expect(new URLSearchParams(query.get()).get("note")).toBe(
        "ゆっくり回りたい",
      );
      // 送った条件と今の条件は同じなので、「条件が変わっています」は出さない
      expect(screen.queryByText(/条件が変わっています/)).toBeNull();
    });

    test("希望を書かなければ、送る条件にも URL にも入れない", async () => {
      const fetchMock = stubFetch();
      renderForm({ submit: false });

      fireEvent.change(noteField(), { target: { value: "   " } });
      fireEvent.blur(noteField());
      fireEvent.click(screen.getByRole("button", { name: "絞る" }));
      await screen.findByText("この条件では候補を組めませんでした");

      expect(sentBody(fetchMock)).not.toHaveProperty("note");
      expect(query.get()).not.toContain("note=");
    });

    test("URL のクエリの希望を読み、100字で切る", () => {
      query.set(
        `?area=any&duration=day&companion=友人&transport=車&note=${encodeURIComponent(`子どもと${"あ".repeat(120)}`)}`,
      );
      renderForm({ submit: false });

      expect(noteField().value).toBe(`子どもと${"あ".repeat(96)}`);
      expect(screen.getByText("残り0文字")).toBeTruthy();
    });

    test("URL の希望が変わったら（ブラウザの「戻る」など）、入力中の文を捨てて URL に合わせる", () => {
      query.set("?area=any&duration=day&companion=友人&transport=車&note=雨");
      renderForm({ submit: false });

      fireEvent.change(noteField(), { target: { value: "書きかけ" } });
      act(() =>
        query.set(
          "?area=any&duration=day&companion=友人&transport=車&note=晴れ",
        ),
      );

      expect(noteField().value).toBe("晴れ");
    });

    test("デモモードで希望があったら、一部だけ反映したと知らせる", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new TypeError("offline")),
      );
      renderForm({ submit: false });

      fireEvent.change(noteField(), { target: { value: "雨の日" } });
      fireEvent.click(screen.getByRole("button", { name: "絞る" }));
      await screen.findByText("松本市をめぐる日帰りプラン");

      expect(screen.getByRole("status").textContent).toContain(
        "希望は、デモモードでは一部",
      );
    });
  });

  describe("経路に加えて作り直す（#32）", () => {
    // 6件あるので、日帰りの経路（4件）に入らないスポットが2件できる
    const sixSpots: PlannableArea[] = [
      {
        ...areas[0],
        spots: [
          ...areas[0].spots,
          spot("matsumoto", "旧開智学校", "history"),
          spot("matsumoto", "四柱神社", "history"),
          spot("matsumoto", "中町通り", "gourmet"),
        ],
      },
    ];

    /**
     * /api/plan の代わり。1回目は本当の作り方（デモモード）で候補を返し、2回目以降は second を返す。
     * 口コミの読み込み（/api/spots/…）には応答を返さない
     */
    function stubPlanApi(
      second: (body: PlanConditions) => Promise<Response> = async (body) =>
        Response.json({
          candidates: generateCandidates(sixSpots, body),
          mode: "ai",
        } satisfies PlanResponse),
    ) {
      let calls = 0;
      const fetchMock = vi.fn((url: string, init?: RequestInit) => {
        if (url !== "/api/plan") return new Promise<Response>(() => {});
        const body = JSON.parse(String(init?.body)) as PlanConditions;
        calls++;
        return calls === 1
          ? Promise.resolve(
              Response.json({
                candidates: generateCandidates(sixSpots, body),
                mode: "ai",
              } satisfies PlanResponse),
            )
          : second(body);
      });
      vi.stubGlobal("fetch", fetchMock);
      return () =>
        fetchMock.mock.calls
          .filter(([url]) => url === "/api/plan")
          .map(([, init]) => JSON.parse(String(init?.body)));
    }

    /** 最初の候補を出し、経路外のスポットのピンを押して詳細を開く。開いたスポットの名前を返す */
    async function openOffRouteSpot() {
      renderForm({ areas: sixSpots });
      const [pin] = await screen.findAllByRole("button", {
        name: /^経路外のピン: /,
      });
      const name = pin.textContent!.replace("経路外のピン: ", "");
      fireEvent.click(pin);
      return name;
    }

    const rebuildButton = () =>
      screen.queryByRole("button", {
        name: "このスポットを経路に加えて作り直す",
      });

    test("経路外のスポットの詳細から押すと、元の条件にスポットを足して呼び直し、候補を差し替える", async () => {
      const sentBodies = stubPlanApi();
      const name = await openOffRouteSpot();

      fireEvent.click(rebuildButton()!);

      // 差し替わると、そのスポットが経路（番号付きのリスト）に入り、経路外のピンから消える
      const list = await screen.findByRole("list");
      await within(list).findByRole("button", { name });
      expect(
        screen.queryByRole("button", { name: `経路外のピン: ${name}` }),
      ).toBeNull();
      const [first, second] = sentBodies();
      expect(second).toEqual({
        ...first,
        includeSpotId: `matsumoto/${name}`,
      });
      expect(screen.queryByRole("alert")).toBeNull();
    });

    test("作り直しに失敗したら、元の候補を残したままエラーを出す", async () => {
      stubPlanApi(() => Promise.reject(new TypeError("offline")));
      const name = await openOffRouteSpot();

      fireEvent.click(rebuildButton()!);

      expect((await screen.findByRole("alert")).textContent).toContain(
        "候補を作り直せませんでした。元の候補のままです。",
      );
      expect(
        screen.getByRole("button", { name: `経路外のピン: ${name}` }),
      ).toBeTruthy();
    });

    test("そのスポットを含む候補が0件なら、元の候補を残したままエラーを出す", async () => {
      stubPlanApi(async () =>
        Response.json({ candidates: [], mode: "ai" } satisfies PlanResponse),
      );
      const name = await openOffRouteSpot();

      fireEvent.click(rebuildButton()!);

      expect((await screen.findByRole("alert")).textContent).toContain(
        `「${name}」を経路に入れた候補を組めませんでした。元の候補のままです。`,
      );
      expect(screen.getByText("松本市をめぐる日帰りプラン")).toBeTruthy();
    });

    test("経路に入っているスポットの詳細には、ボタンを出さない", async () => {
      stubPlanApi();
      renderForm({ areas: sixSpots });
      const list = await screen.findByRole("list");

      fireEvent.click(within(list).getAllByRole("button")[0]);

      expect(await screen.findByRole("dialog")).toBeTruthy();
      expect(rebuildButton()).toBeNull();
    });
  });
});
