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
  if (submit)
    fireEvent.click(screen.getByRole("button", { name: "旅プランをつくる" }));
}

/** エリアの都道府県・市区町村の select（#147） */
const prefectureSelect = () =>
  screen.getByRole<HTMLSelectElement>("combobox", { name: "都道府県" });
const areaSelect = () =>
  screen.getByRole<HTMLSelectElement>("combobox", { name: "市区町村" });

/** 県 → 市区町村の順に選ぶ */
function chooseArea(prefecture: string, areaId?: string) {
  fireEvent.change(prefectureSelect(), { target: { value: prefecture } });
  if (areaId) fireEvent.change(areaSelect(), { target: { value: areaId } });
}

/** 長野県に2地域、北海道に1地域（県だけ選んだときの候補を確かめる、#147） */
const twoPrefectures: PlannableArea[] = [
  areas[0],
  {
    id: "azumino",
    name: "安曇野市",
    prefecture: "長野県",
    catchphrase: null,
    center_lat: 36.304,
    center_lng: 137.906,
    spots: [
      spot("azumino", "わさび田", "nature"),
      spot("azumino", "美術館", "craft"),
    ],
  },
  {
    id: "higashikawa",
    name: "東川町",
    prefecture: "北海道",
    catchphrase: null,
    center_lat: 43.699,
    center_lng: 142.512,
    spots: [
      spot("higashikawa", "旭岳", "view"),
      spot("higashikawa", "湧き水", "nature"),
    ],
  },
];

/** fetch に送った本文 */
function sentBody(fetchMock: ReturnType<typeof vi.fn>) {
  return JSON.parse(fetchMock.mock.calls[0][1].body);
}

/** 画面の幅と「動きを減らす」の設定。matchMedia は jsdom にないので差し替える */
function stubMatchMedia({
  wide = false,
  reduceMotion = false,
}: { wide?: boolean; reduceMotion?: boolean } = {}) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((media: string) => ({
      media,
      matches:
        (media === "(min-width: 1024px)" && wide) ||
        (media === "(prefers-reduced-motion: reduce)" && reduceMotion),
    })),
  );
}

beforeEach(() => {
  query.set("");
  stubMatchMedia();
  // jsdom には scrollIntoView がない
  Element.prototype.scrollIntoView = vi.fn();
  vi.spyOn(window.history, "replaceState").mockImplementation(
    (_data, _unused, url) => query.set(String(url ?? "")),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PlannerForm", () => {
  test("作る前の空の「旅の候補」の枠は、スマホ（lg 未満）では出さない（#163）", () => {
    renderForm({ submit: false });

    // jsdom は CSS を当てないので、lg 未満で隠すクラスが付いていることを確かめる
    const empty = screen
      .getByText("旅の候補がここに表示されます")
      .closest(".max-lg\\:hidden");
    expect(empty).not.toBeNull();
  });

  test("/api/plan が失敗したら、ブラウザでデモモードの候補を出す", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    renderForm();

    // 見つからなければ findByText が失敗する
    await screen.findByText("松本市をめぐる日帰りプラン");
    expect(screen.getByText(/デモモードで作成しました/)).toBeTruthy();
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
    expect(
      screen.getByText(/短い時間に何度も作ったため、デモモードで作成しました/),
    ).toBeTruthy();
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

      chooseArea("長野県", "matsumoto");
      fireEvent.click(screen.getByRole("button", { name: "1泊2日" }));
      fireEvent.click(screen.getByRole("button", { name: "温泉" }));
      fireEvent.click(screen.getByRole("button", { name: "旅プランをつくる" }));
      await screen.findByText("この条件では候補を組めませんでした");

      expect(sentBody(fetchMock)).toMatchObject({
        areaId: "matsumoto",
        duration: "1n2d",
        interests: ["温泉"],
      });
      expect(sentBody(fetchMock)).not.toHaveProperty("prefecture");
      expect(query.get()).toContain("area=matsumoto");
      expect(query.get()).not.toContain("prefecture=");
      expect(query.get()).toContain("duration=1n2d");
    });

    test("県だけ選ぶと、県の名前を送り、URL にも持つ（#147）", async () => {
      const fetchMock = stubFetch();
      renderForm({ submit: false, areas: twoPrefectures });

      chooseArea("長野県");
      fireEvent.click(screen.getByRole("button", { name: "旅プランをつくる" }));
      await screen.findByText("この条件では候補を組めませんでした");

      expect(sentBody(fetchMock)).toMatchObject({
        areaId: null,
        prefecture: "長野県",
      });
      expect(new URLSearchParams(query.get()).get("prefecture")).toBe("長野県");
      expect(
        screen
          .getByRole("button", { name: "おまかせ" })
          .getAttribute("aria-pressed"),
      ).toBe("false");
    });

    test("地域を選ぶと「おまかせ」が外れ、「おまかせ」を押すと県と地域の選択が外れる", () => {
      renderForm({ submit: false });
      const any = screen.getByRole("button", { name: "おまかせ" });
      expect(any.getAttribute("aria-pressed")).toBe("true");

      chooseArea("長野県", "matsumoto");
      expect(any.getAttribute("aria-pressed")).toBe("false");
      expect(prefectureSelect().value).toBe("長野県");
      expect(areaSelect().value).toBe("matsumoto");

      fireEvent.click(any);
      expect(any.getAttribute("aria-pressed")).toBe("true");
      expect(prefectureSelect().value).toBe("");
      expect(areaSelect().value).toBe("");
    });

    test("県 → 市区町村の2段で選ぶ。市区町村は、選んだ県の地域だけを出す（#147）", () => {
      renderForm({ submit: false, areas: twoPrefectures });

      // 県は登録済みの地域がある県だけを、display_order の順に出す（案 A）
      expect([...prefectureSelect().options].map((o) => o.textContent)).toEqual(
        ["選ぶ", "長野県", "北海道"],
      );
      // 県を選ぶまで、市区町村は選べない
      expect(areaSelect().disabled).toBe(true);

      chooseArea("長野県");
      expect(areaSelect().disabled).toBe(false);
      expect([...areaSelect().options].map((o) => o.textContent)).toEqual([
        "選ぶ",
        "松本市",
        "安曇野市",
      ]);

      chooseArea("長野県", "azumino");
      // 県を変えると、市区町村の選択は外れる
      chooseArea("北海道");
      expect(areaSelect().value).toBe("");
      expect([...areaSelect().options].map((o) => o.textContent)).toEqual([
        "選ぶ",
        "東川町",
      ]);
    });

    test("市区町村を「市区町村を選ぶ」に戻すと、県だけ選んだ状態になる", () => {
      renderForm({ submit: false, areas: twoPrefectures });

      chooseArea("長野県", "matsumoto");
      fireEvent.change(areaSelect(), { target: { value: "" } });

      expect(prefectureSelect().value).toBe("長野県");
      const params = new URLSearchParams(query.get());
      expect(params.get("area")).toBe("any");
      expect(params.get("prefecture")).toBe("長野県");
    });

    test("URL のクエリの県を読む（地域を選んでいれば、県のクエリは使わない）", () => {
      query.set(
        "?area=any&prefecture=北海道&duration=day&companion=友人&transport=車",
      );
      renderForm({ submit: false, areas: twoPrefectures });
      expect(prefectureSelect().value).toBe("北海道");
      expect(areaSelect().value).toBe("");
    });

    test("URL のクエリの条件を読む", () => {
      query.set("?area=matsumoto&duration=2n3d&companion=友人&transport=車");
      renderForm({ submit: false });

      expect(prefectureSelect().value).toBe("長野県");
      expect(areaSelect().value).toBe("matsumoto");
      expect(
        screen
          .getByRole("button", { name: "2泊3日" })
          .getAttribute("aria-pressed"),
      ).toBe("true");
    });

    test("URL のクエリの知らない地域・日程は、おまかせ・日帰りにする", () => {
      query.set(
        "?area=unknown&prefecture=大阪府&duration=9n10d&companion=友人&transport=車",
      );
      renderForm({ submit: false });

      expect(prefectureSelect().value).toBe("");
      expect(areaSelect().value).toBe("");
      expect(
        screen
          .getByRole("button", { name: "日帰り" })
          .getAttribute("aria-pressed"),
      ).toBe("true");
    });
  });

  describe("条件のチップのアイコン（#148）", () => {
    const groups = [
      { name: "日程", labels: ["日帰り", "1泊2日", "2泊3日"] },
      {
        name: "興味のあること（複数選べます）",
        labels: ["食", "自然", "絶景", "温泉", "体験", "歴史"],
      },
      {
        name: "だれと",
        labels: ["ひとり", "友人", "カップル", "家族（子連れ）"],
      },
      { name: "移動手段", labels: ["車", "電車・バス", "自転車"] },
    ];

    test.each(groups)(
      "「$name」のすべての選択肢に、読み上げないアイコンが付き、読み上げは文字のまま",
      ({ name, labels }) => {
        renderForm({ submit: false });
        const group = screen.getByRole("group", { name });
        const chips = within(group).getAllByRole("button");

        expect(chips.map((chip) => chip.textContent)).toEqual(labels);
        for (const [i, chip] of chips.entries()) {
          // アクセシブルな名前は文字だけ（アイコンは名前に入らない）
          expect(within(group).getByRole("button", { name: labels[i] })).toBe(
            chip,
          );
          const icons = chip.querySelectorAll("svg");
          expect(icons).toHaveLength(1);
          expect(icons[0].getAttribute("aria-hidden")).toBe("true");
        }
      },
    );

    test("エリアの「おまかせ」にも読み上げないアイコンが付く", () => {
      renderForm({ submit: false });
      const any = screen.getByRole("button", { name: "おまかせ" });
      expect(any.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
        "true",
      );
    });

    test("アイコンを付けても、チップは Tab で移れるボタンで、押すと選択が切り替わる", () => {
      renderForm({ submit: false });
      const onsen = screen.getByRole("button", { name: "温泉" });
      onsen.focus();
      expect(document.activeElement).toBe(onsen);
      expect(onsen.getAttribute("aria-pressed")).toBe("false");

      fireEvent.click(onsen);
      expect(
        screen
          .getByRole("button", { name: "温泉" })
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

    test("「旅プランをつくる」で、入力中の希望も URL に書いて送る", async () => {
      const fetchMock = stubFetch();
      renderForm({ submit: false });

      fireEvent.change(noteField(), {
        target: { value: " ゆっくり回りたい " },
      });
      fireEvent.click(screen.getByRole("button", { name: "旅プランをつくる" }));
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
      fireEvent.click(screen.getByRole("button", { name: "旅プランをつくる" }));
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

    test("家族の絵文字も1文字と数え、100字を超えた入力は絵文字を分けずに切る", () => {
      renderForm({ submit: false });

      fireEvent.change(noteField(), {
        target: { value: "👨‍👩‍👧‍👦".repeat(99) },
      });
      expect(noteField().value).toBe("👨‍👩‍👧‍👦".repeat(99));
      expect(screen.getByText("残り1文字")).toBeTruthy();

      fireEvent.change(noteField(), {
        target: { value: "👨‍👩‍👧‍👦".repeat(101) },
      });
      expect(noteField().value).toBe("👨‍👩‍👧‍👦".repeat(100));
      expect(screen.getByText("残り0文字")).toBeTruthy();
      // 文字数の上限はブラウザの maxLength（UTF-16 で数える）に任せない
      expect(noteField().maxLength).toBe(-1);
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
      fireEvent.click(screen.getByRole("button", { name: "旅プランをつくる" }));
      await screen.findByText("松本市をめぐる日帰りプラン");

      expect(screen.getByText(/希望は、デモモードでは一部/)).toBeTruthy();
    });
  });

  describe("押してから結果が出るまで（#123）", () => {
    /** 応答を止めておける /api/plan。resolve を呼ぶまで返さない */
    function stubPendingFetch() {
      let resolve: (res: Response) => void = () => {};
      const fetchMock = vi.fn(
        () =>
          new Promise<Response>((r) => {
            resolve = r;
          }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const respond = async (body: PlanResponse) => {
        await act(async () => resolve(Response.json(body)));
      };
      return { fetchMock, respond };
    }
    const planned = (): PlanResponse => ({
      candidates: generateCandidates(areas, {
        areaId: null,
        duration: "day",
        interests: [],
        companion: "ひとり",
        transport: "車",
      }),
      mode: "ai",
    });

    test("結果が出る前の案内は「条件を選んで「旅プランをつくる」を押すと」", () => {
      renderForm({ submit: false });

      expect(
        screen.getByText(
          "条件を選んで「旅プランをつくる」を押すと、おすすめの地域とルートを地図つきで提案します。",
        ),
      ).toBeTruthy();
      expect(screen.queryByText(/左の条件/)).toBeNull();
    });

    test("作っている間は「旅プランをつくっています」を出し、ボタンは aria-disabled にしてフォーカスを残す", async () => {
      const { fetchMock, respond } = stubPendingFetch();
      renderForm({ submit: false });
      const button = screen.getByRole("button", { name: "旅プランをつくる" });
      button.focus();

      fireEvent.click(button);

      const status = screen
        .getAllByRole("status")
        .find((el) => el.textContent?.includes("旅プランをつくっています"));
      expect(status).toBeTruthy();
      expect(button.getAttribute("aria-disabled")).toBe("true");
      expect(button.hasAttribute("disabled")).toBe(false);
      expect(document.activeElement).toBe(button);

      // 作っている間に押しても、もう一度は呼ばない
      fireEvent.click(button);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await respond(planned());
      expect(screen.queryByText("旅プランをつくっています")).toBeNull();
    });

    test("結果が出たら、結果の見出しにフォーカスを移し、件数を読み上げる。ボタンは「この条件でつくり直す」になる", async () => {
      const { respond } = stubPendingFetch();
      renderForm({ submit: false });
      const button = screen.getByRole("button", { name: "旅プランをつくる" });
      button.focus();
      fireEvent.click(button);

      await respond(planned());

      const heading = screen.getByRole("heading", { name: "旅の候補" });
      expect(document.activeElement).toBe(heading);
      const count = planned().candidates.length;
      expect(
        screen
          .getAllByRole("status")
          .some(
            (el) => el.textContent === `旅の候補を${count}件つくりました。`,
          ),
      ).toBe(true);
      expect(screen.getByRole("button", { name: "この条件でつくり直す" })).toBe(
        button,
      );
      expect(button.getAttribute("aria-disabled")).toBe("false");
    });

    test("候補が0件なら、そのことを読み上げる", async () => {
      const { respond } = stubPendingFetch();
      renderForm();

      await respond({ candidates: [], mode: "ai" });

      expect(
        screen
          .getAllByRole("status")
          .some(
            (el) => el.textContent === "この条件では候補を組めませんでした。",
          ),
      ).toBe(true);
    });

    test("作っている間にほかの欄へ移っていたら、結果が出てもフォーカスを奪わない", async () => {
      const { respond } = stubPendingFetch();
      renderForm();
      const note = screen.getByLabelText("ほかに希望があれば（任意）");
      note.focus();

      await respond(planned());

      expect(document.activeElement).toBe(note);
    });

    test("条件と結果が縦に並ぶ幅では、押すと結果の欄までなめらかに動かす", () => {
      stubPendingFetch();
      renderForm();

      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "start",
      });
    });

    test("動きを減らす設定なら、アニメーションせずに動かす", () => {
      stubMatchMedia({ reduceMotion: true });
      stubPendingFetch();
      renderForm();

      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: "auto",
        block: "start",
      });
    });

    test("条件と結果が横に並ぶ幅（PC）では、動かさない", () => {
      stubMatchMedia({ wide: true });
      stubPendingFetch();
      renderForm();

      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    });

    test("チップのまとまりは、見出しを名前にした group にする", () => {
      renderForm({ submit: false });

      for (const name of [
        "エリア",
        "日程",
        "興味のあること（複数選べます）",
        "だれと",
        "移動手段",
      ]) {
        expect(screen.getByRole("group", { name })).toBeTruthy();
      }
      expect(
        within(screen.getByRole("group", { name: "日程" })).getByRole(
          "button",
          { name: "1泊2日" },
        ),
      ).toBeTruthy();
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
      // 経路のカードは全体が1つのボタンで、名前はスポット名から始まる（#138）
      await within(list).findByRole("button", {
        name: (accessibleName) => accessibleName.startsWith(name),
      });
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

    const previousPlanButton = () =>
      screen.queryByRole("button", { name: "前のプランに戻る" });

    /** 経路外のピンを押して、そのスポットで作り直す。作り直した候補が出るまで待つ */
    async function rebuildWithFirstOffRouteSpot() {
      const [pin] = screen.getAllByRole("button", { name: /^経路外のピン: / });
      const name = pin.textContent!.replace("経路外のピン: ", "");
      fireEvent.click(pin);
      fireEvent.click(rebuildButton()!);
      await within(await screen.findByRole("list")).findByRole("button", {
        name: (accessibleName) => accessibleName.startsWith(name),
      });
      return name;
    }

    describe("前のプランに戻る（#149）", () => {
      test("作り直したあとに押すと、作り直す前と同じ経路に戻り、加えたスポットが外れたことを出す", async () => {
        stubPlanApi();
        renderForm({ areas: sixSpots });
        const routeBefore = (await screen.findByRole("list")).textContent;
        expect(previousPlanButton()).toBeNull();

        const name = await rebuildWithFirstOffRouteSpot();
        expect(screen.getByRole("list").textContent).not.toBe(routeBefore);
        expect(
          screen.getByText(`「${name}」を経路に加える前のプラン`),
        ).toBeTruthy();

        fireEvent.click(previousPlanButton()!);

        expect(screen.getByRole("list").textContent).toBe(routeBefore);
        expect(
          screen.getByRole("button", { name: `経路外のピン: ${name}` }),
        ).toBeTruthy();
        expect(
          screen.getByText(
            `「${name}」を経路から外し、加える前のプランに戻しました。`,
          ),
        ).toBeTruthy();
        // 戻れるのは作り直した回数（1回）ぶんだけ。ボタンが消えるので、フォーカスは結果の見出しへ
        expect(previousPlanButton()).toBeNull();
        expect(document.activeElement).toBe(
          screen.getByRole("heading", { name: "旅の候補" }),
        );
      });

      test("2回作り直したら、2回ぶん1つずつ戻れる。呼び直さない", async () => {
        const sentBodies = stubPlanApi();
        renderForm({ areas: sixSpots });
        const route0 = (await screen.findByRole("list")).textContent;
        const first = await rebuildWithFirstOffRouteSpot();
        const route1 = screen.getByRole("list").textContent;
        const second = await rebuildWithFirstOffRouteSpot();
        expect(sentBodies()).toHaveLength(3);

        fireEvent.click(previousPlanButton()!);
        expect(screen.getByRole("list").textContent).toBe(route1);
        expect(
          screen.getByText(
            `「${second}」を経路から外し、加える前のプランに戻しました。`,
          ),
        ).toBeTruthy();
        expect(
          screen.getByText(`「${first}」を経路に加える前のプラン`),
        ).toBeTruthy();

        fireEvent.click(previousPlanButton()!);
        expect(screen.getByRole("list").textContent).toBe(route0);
        expect(previousPlanButton()).toBeNull();
        expect(sentBodies()).toHaveLength(3);
      });

      test("作り直しに失敗したときは、履歴に積まない", async () => {
        stubPlanApi(() => Promise.reject(new TypeError("offline")));
        await openOffRouteSpot();

        fireEvent.click(rebuildButton()!);

        await screen.findByRole("alert");
        expect(previousPlanButton()).toBeNull();
      });

      test("「この条件でつくり直す」で新しく作ると、履歴を捨てる", async () => {
        stubPlanApi();
        renderForm({ areas: sixSpots });
        await screen.findByRole("list");
        await rebuildWithFirstOffRouteSpot();
        expect(previousPlanButton()).toBeTruthy();

        fireEvent.click(
          screen.getByRole("button", { name: "この条件でつくり直す" }),
        );

        await screen.findByRole("heading", { name: "旅の候補" });
        await screen.findByRole("list");
        expect(previousPlanButton()).toBeNull();
      });
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
