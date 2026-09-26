import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { MapPoint } from "@/components/map/spot-map";
import { NICKNAME_STORAGE_KEY } from "@/lib/community/review-client";
import {
  SpotSubmissionProvider,
  SpotSubmissionTrigger,
} from "./spot-submission";
import type { SubmittableArea } from "./spot-submission-form";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

/** 地図をタップした場所（テストの地図のボタンを押すと、ここを渡す） */
const TAP: MapPoint = { lat: 36.3, lng: 137.9 };

// 地図（MapLibre）は jsdom では描けないので、地域名とピンを出し、押すと TAP の場所を渡すボタンにする
vi.mock("@/components/map/spot-map", () => ({
  SpotMap: ({
    areaName,
    pin,
    onMapClick,
  }: {
    areaName?: string;
    pin?: MapPoint | null;
    onMapClick?: (point: MapPoint) => void;
  }) => (
    <div data-testid="map">
      {areaName}
      {pin && <span data-testid="pin">{`${pin.lat},${pin.lng}`}</span>}
      <button type="button" onClick={() => onMapClick?.(TAP)}>
        地図をタップ
      </button>
    </div>
  ),
}));

const AREAS: SubmittableArea[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "白馬村",
    prefecture: "長野県",
    center_lat: 36.7,
    center_lng: 137.86,
    boundary: null,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "東川町",
    prefecture: "北海道",
    center_lat: 43.7,
    center_lng: 142.5,
    boundary: null,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "安曇野市",
    prefecture: "長野県",
    center_lat: 36.3,
    center_lng: 137.9,
    boundary: null,
  },
];
const AZUMINO = AREAS[2];

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockReset();
  window.localStorage.clear();
});

/** 呼ばれた順に応答を返す fetch */
function stubFetch(...responses: (Response | Error)[]) {
  const fetchMock = vi.fn();
  for (const r of responses) {
    if (r instanceof Error) fetchMock.mockRejectedValueOnce(r);
    else fetchMock.mockResolvedValueOnce(r);
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderEntry(loadAreas: () => Promise<SubmittableArea[] | null>) {
  render(
    <SpotSubmissionProvider loadAreas={loadAreas}>
      <SpotSubmissionTrigger />
    </SpotSubmissionProvider>,
  );
}

/**
 * ボタンを押し、地域の Promise を読むまで待つ
 * （act の外で解決すると、React が中断していた描画を続けないため）
 */
async function clickTrigger() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "穴場を教える" }));
  });
}

/** ボタンからダイアログを開く */
async function open(areas: SubmittableArea[] | null) {
  renderEntry(() => Promise.resolve(areas));
  await clickTrigger();
}

/** ダイアログを開き、フォームを返す */
async function openForm(areas: SubmittableArea[] | null = AREAS) {
  await open(areas);
  return screen.getByRole("form", { name: "穴場を教える" });
}

/** 県 → 市区町村の順に地域を選ぶ（#147） */
function chooseArea(form: HTMLElement, area: SubmittableArea) {
  fireEvent.change(within(form).getByLabelText("都道府県"), {
    target: { value: area.prefecture },
  });
  fireEvent.change(within(form).getByLabelText("市区町村"), {
    target: { value: area.id },
  });
}

/** 地域を選び、地図のボタン（テスト用）を押してピンを置く */
async function selectAreaAndPin(form: HTMLElement) {
  chooseArea(form, AZUMINO);
  fireEvent.click(await within(form).findByText("地図をタップ"));
}

function fillText(
  form: HTMLElement,
  {
    name = "朝の田んぼ道",
    description = "朝の光がきれい",
    nickname = "地元の人",
  } = {},
) {
  fireEvent.change(within(form).getByLabelText("スポット名"), {
    target: { value: name },
  });
  fireEvent.click(within(form).getByRole("button", { name: "自然・散策" }));
  fireEvent.change(within(form).getByLabelText("ひとこと"), {
    target: { value: description },
  });
  fireEvent.change(within(form).getByLabelText("ニックネーム"), {
    target: { value: nickname },
  });
}

function submitButton(form: HTMLElement) {
  return within(form).getByRole("button", {
    name: "投稿する",
  }) as HTMLButtonElement;
}

describe("穴場を教えるフォーム", () => {
  test("地域は県 → 市区町村の2段で選び、送る前の注意を出す（#147）", async () => {
    const form = await openForm();
    const area = within(form).getByRole("group", { name: "地域" });
    const prefecture = within(area).getByRole<HTMLSelectElement>("combobox", {
      name: "都道府県",
    });
    const municipality = within(area).getByRole<HTMLSelectElement>("combobox", {
      name: "市区町村",
    });
    const texts = (select: HTMLSelectElement) =>
      [...select.options].map((o) => o.textContent);

    // 登録済みの地域がある県だけを、display_order の順に出す（案 A）
    expect(texts(prefecture)).toEqual(["選ぶ", "長野県", "北海道"]);
    expect(municipality.disabled).toBe(true);
    // 送る値は市区町村なので、必須であることを読み上げに伝える
    expect(municipality.getAttribute("aria-required")).toBe("true");

    fireEvent.change(prefecture, { target: { value: "長野県" } });
    expect(municipality.disabled).toBe(false);
    expect(texts(municipality)).toEqual(["選ぶ", "白馬村", "安曇野市"]);
    expect(form.textContent).toContain(
      "ログインは不要です。スポット名・ひとこと・ニックネームはすぐ公開されます。管理者が非表示にすることがあります。",
    );
  });

  test("地域を選ぶまでは地図を出さず、ピンを置くまで送信できない", async () => {
    const form = await openForm();

    expect(within(form).queryByTestId("map")).toBeNull();
    expect(form.textContent).toContain("地域を選ぶと地図が出ます");
    fillText(form);
    expect(submitButton(form).disabled).toBe(true);

    await selectAreaAndPin(form);
    expect(within(form).getByTestId("map").textContent).toContain("安曇野市");
    expect(within(form).getByTestId("pin").textContent).toBe("36.3,137.9");
    expect(submitButton(form).disabled).toBe(false);
  });

  test("地域を変えたら、置いたピンを外す", async () => {
    const form = await openForm();
    await selectAreaAndPin(form);

    chooseArea(form, AREAS[0]);
    expect(within(form).queryByTestId("pin")).toBeNull();
    expect(submitButton(form).disabled).toBe(true);
  });

  test("県を変えたら、市区町村の選択と置いたピンを外す", async () => {
    const form = await openForm();
    await selectAreaAndPin(form);

    fireEvent.change(within(form).getByLabelText("都道府県"), {
      target: { value: "北海道" },
    });
    const municipality =
      within(form).getByLabelText<HTMLSelectElement>("市区町村");
    expect(municipality.value).toBe("");
    expect([...municipality.options].map((o) => o.textContent)).toEqual([
      "選ぶ",
      "東川町",
    ]);
    expect(within(form).queryByTestId("pin")).toBeNull();
    expect(within(form).queryByTestId("map")).toBeNull();
  });

  test("送ると API に JSON で送り、成功したら「公開しました」を出して読み込み直す", async () => {
    const fetchMock = stubFetch(
      Response.json({ id: "new", message: "公開しました" }, { status: 201 }),
    );
    const form = await openForm();
    await selectAreaAndPin(form);
    fillText(form, { name: "  朝の田んぼ道  " });
    fireEvent.click(submitButton(form));

    expect(
      await screen.findByText("ありがとうございます。公開しました"),
    ).toBeTruthy();
    expect(refresh).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/spot-submissions");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toBe(
      "application/json",
    );
    expect(JSON.parse(init.body as string)).toEqual({
      areaId: AZUMINO.id,
      name: "朝の田んぼ道",
      category: "nature",
      description: "朝の光がきれい",
      lat: TAP.lat,
      lng: TAP.lng,
      nickname: "地元の人",
      website: "",
    });
    expect(window.localStorage.getItem(NICKNAME_STORAGE_KEY)).toBe("地元の人");
  });

  test("上限を超える入力は送らず、欄の下に理由を出す", async () => {
    const fetchMock = stubFetch();
    const form = await openForm();
    await selectAreaAndPin(form);
    fillText(form, { name: "あ".repeat(41), nickname: "い".repeat(21) });
    fireEvent.change(within(form).getByLabelText("ひとこと"), {
      target: { value: "う".repeat(301) },
    });

    expect(form.textContent).toContain("1文字多すぎます");
    fireEvent.click(submitButton(form));

    expect(form.textContent).toContain("スポット名は40文字以内にしてください");
    expect(form.textContent).toContain("ひとことは300文字以内にしてください");
    expect(form.textContent).toContain(
      "ニックネームは20文字以内にしてください",
    );
    expect(within(form).getByLabelText("スポット名").ariaInvalid).toBe("true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("カテゴリを選ばなければ送らない", async () => {
    const fetchMock = stubFetch();
    const form = await openForm();
    await selectAreaAndPin(form);
    fireEvent.change(within(form).getByLabelText("スポット名"), {
      target: { value: "朝の田んぼ道" },
    });
    fireEvent.change(within(form).getByLabelText("ひとこと"), {
      target: { value: "朝の光がきれい" },
    });
    fireEvent.change(within(form).getByLabelText("ニックネーム"), {
      target: { value: "地元の人" },
    });
    fireEvent.click(submitButton(form));

    expect(form.textContent).toContain("カテゴリを選んでください");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("場所が地域の範囲の外なら、フォームの上と場所の欄に出し、置き直すと場所の理由は消える", async () => {
    stubFetch(
      Response.json(
        { error: "out_of_area", message: "場所が地域の範囲の外です" },
        { status: 400 },
      ),
    );
    const form = await openForm();
    await selectAreaAndPin(form);
    fillText(form);
    fireEvent.click(submitButton(form));

    expect((await within(form).findByRole("alert")).textContent).toBe(
      "場所が地域の範囲の外です",
    );
    expect(form.textContent).toContain("地域の範囲の中にピンを置いてください");
    expect(screen.queryByText("ありがとうございます。公開しました")).toBeNull();
    expect(refresh).not.toHaveBeenCalled();

    fireEvent.click(within(form).getByText("地図をタップ"));
    expect(form.textContent).not.toContain(
      "地域の範囲の中にピンを置いてください",
    );
  });

  test.each([
    [429, "続けて投稿されています。しばらくしてからお試しください"],
    [503, "いまは受け付けていません"],
  ])(
    "%i のときは API のメッセージをフォームの上に出し、入力は残す",
    async (status, message) => {
      stubFetch(Response.json({ error: "x", message }, { status }));
      const form = await openForm();
      await selectAreaAndPin(form);
      fillText(form);
      fireEvent.click(submitButton(form));

      expect((await within(form).findByRole("alert")).textContent).toBe(
        message,
      );
      expect(
        (within(form).getByLabelText("スポット名") as HTMLInputElement).value,
      ).toBe("朝の田んぼ道");
    },
  );

  test("400 の欄ごとの理由は、その欄の下に出す", async () => {
    stubFetch(
      Response.json(
        {
          error: "invalid_request",
          message: "入力の内容を確かめてください",
          fields: { name: "スポット名に改行は入れられません" },
        },
        { status: 400 },
      ),
    );
    const form = await openForm();
    await selectAreaAndPin(form);
    fillText(form);
    fireEvent.click(submitButton(form));

    expect((await within(form).findByRole("alert")).textContent).toBe(
      "入力の内容を確かめてください",
    );
    expect(form.textContent).toContain("スポット名に改行は入れられません");
  });

  test("通信に失敗したら、通信の状態を確かめるよう出す", async () => {
    stubFetch(new TypeError("Failed to fetch"));
    const form = await openForm();
    await selectAreaAndPin(form);
    fillText(form);
    fireEvent.click(submitButton(form));

    expect((await within(form).findByRole("alert")).textContent).toContain(
      "通信の状態を確かめて",
    );
  });

  test("覚えたニックネームを最初から入れておく", async () => {
    window.localStorage.setItem(NICKNAME_STORAGE_KEY, "安曇野の人");
    const form = await openForm();

    expect(
      (within(form).getByLabelText("ニックネーム") as HTMLInputElement).value,
    ).toBe("安曇野の人");
  });

  test("地域を読めなかったときは、ダイアログの中で知らせる", async () => {
    await open(null);

    expect(screen.getByRole("alert").textContent).toContain(
      "地域を読み込めませんでした",
    );
  });

  test("地域は初めて開いたときに1回だけ読み、開き直しても読み直さない", async () => {
    const loadAreas = vi.fn(() => Promise.resolve(AREAS));
    renderEntry(loadAreas);
    expect(loadAreas).not.toHaveBeenCalled();

    await clickTrigger();
    fireEvent.click(screen.getByRole("button", { name: "やめる" }));
    await clickTrigger();

    expect(screen.getByRole("form", { name: "穴場を教える" })).toBeTruthy();
    expect(loadAreas).toHaveBeenCalledTimes(1);
  });

  test("地域を読めなかったら、次に開いたときに読み直す", async () => {
    const loadAreas = vi
      .fn<() => Promise<SubmittableArea[] | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(AREAS);
    renderEntry(loadAreas);

    await clickTrigger();
    expect(screen.getByRole("alert").textContent).toContain(
      "地域を読み込めませんでした",
    );
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    await clickTrigger();

    expect(screen.getByRole("form", { name: "穴場を教える" })).toBeTruthy();
    expect(loadAreas).toHaveBeenCalledTimes(2);
  });

  test("「やめる」で閉じる", async () => {
    const form = await openForm();
    fireEvent.click(within(form).getByRole("button", { name: "やめる" }));

    expect(screen.queryByRole("form", { name: "穴場を教える" })).toBeNull();
  });
});
