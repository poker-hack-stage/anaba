import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { SpotReviews } from "@/lib/community/reviews";
import { NICKNAME_STORAGE_KEY } from "@/lib/community/review-client";
import { SpotReviewsSection } from "./spot-reviews";

const SPOT_ID = "11111111-1111-4111-8111-111111111111";

const REVIEWS: SpotReviews = {
  reviews: [
    {
      id: "r2",
      spot_id: SPOT_ID,
      nickname: "安曇野の人",
      rating: 5,
      body: "朝の光がきれい。\n静かでした",
      created_at: "2026-09-24T01:00:00Z",
    },
    {
      id: "r1",
      spot_id: SPOT_ID,
      nickname: "旅の人",
      rating: 3,
      body: "<b>駐車場</b>が狭い",
      created_at: "2026-09-20T01:00:00Z",
    },
  ],
  count: 2,
  average: 4,
};

afterEach(() => {
  vi.unstubAllGlobals();
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

function openForm() {
  fireEvent.click(screen.getByRole("button", { name: "口コミを書く" }));
  return screen.getByRole("form", { name: "口コミを書く" });
}

function fillForm(
  form: HTMLElement,
  { nickname = "地元の人", stars = 4, body = "夕方がおすすめ" } = {},
) {
  fireEvent.change(within(form).getByLabelText("ニックネーム"), {
    target: { value: nickname },
  });
  if (stars) fireEvent.click(within(form).getByLabelText(`星${stars}つ`));
  fireEvent.change(within(form).getByLabelText("口コミ"), {
    target: { value: body },
  });
}

describe("SpotReviewsSection の一覧", () => {
  test("読み込み中はスケルトン、読んだら件数・平均と新しい順の一覧を出す", async () => {
    const fetchMock = stubFetch(Response.json(REVIEWS));
    render(<SpotReviewsSection spotId={SPOT_ID} />);

    expect(
      screen.getByRole("status", { name: "口コミを読み込んでいます" }),
    ).toBeTruthy();
    expect(await screen.findByText("安曇野の人")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/spots/${SPOT_ID}/reviews`,
      expect.anything(),
    );

    const heading = screen.getByRole("heading", { name: /口コミ/ });
    expect(heading.textContent).toContain("4.0");
    expect(heading.textContent).toContain("（2件）");

    const items = screen.getAllByRole("listitem");
    expect(items[0].textContent).toContain("安曇野の人");
    expect(items[0].textContent).toContain("2026/9/24");
    expect(items[1].textContent).toContain("旅の人");
  });

  test("本文は HTML として読まず、そのままの文字で出す", async () => {
    stubFetch(Response.json(REVIEWS));
    render(<SpotReviewsSection spotId={SPOT_ID} />);

    expect(await screen.findByText("<b>駐車場</b>が狭い")).toBeTruthy();
    expect(document.querySelector("li b")).toBeNull();
  });

  test("口コミがなければ、ない旨を出す", async () => {
    stubFetch(Response.json({ reviews: [], count: 0, average: null }));
    render(<SpotReviewsSection spotId={SPOT_ID} />);

    expect(await screen.findByText(/まだ口コミはありません/)).toBeTruthy();
  });

  test("読めなければ「口コミを読み込めませんでした」を出し、もう一度読み込める", async () => {
    stubFetch(new Response("", { status: 500 }), Response.json(REVIEWS));
    render(<SpotReviewsSection spotId={SPOT_ID} />);

    expect((await screen.findByRole("alert")).textContent).toBe(
      "口コミを読み込めませんでした",
    );
    fireEvent.click(screen.getByRole("button", { name: "もう一度読み込む" }));
    expect(await screen.findByText("安曇野の人")).toBeTruthy();
  });
});

describe("SpotReviewsSection のフォーム", () => {
  test("書いたら一覧の先頭に足し、フォームを閉じ、ニックネームを覚える", async () => {
    const fetchMock = stubFetch(
      Response.json(REVIEWS),
      Response.json(
        {
          review: {
            spot_id: SPOT_ID,
            nickname: "地元の人",
            rating: 4,
            body: "夕方がおすすめ",
          },
        },
        { status: 201 },
      ),
      // 書いたあとの読み直しは失敗しても、足した口コミは残る
      new Error("offline"),
    );
    render(<SpotReviewsSection spotId={SPOT_ID} />);
    await screen.findByText("安曇野の人");

    const form = openForm();
    expect(form.textContent).toContain(
      "ログインは不要です。ニックネームと本文は公開されます。",
    );
    fillForm(form);
    fireEvent.submit(form);

    expect(await screen.findByText("夕方がおすすめ")).toBeTruthy();
    expect(screen.getAllByRole("listitem")[0].textContent).toContain(
      "地元の人",
    );
    expect(
      screen.getByRole("heading", { name: /口コミ/ }).textContent,
    ).toContain("（3件）");
    expect(screen.queryByRole("form", { name: "口コミを書く" })).toBeNull();
    expect(window.localStorage.getItem(NICKNAME_STORAGE_KEY)).toBe("地元の人");

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`/api/spots/${SPOT_ID}/reviews`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      nickname: "地元の人",
      rating: 4,
      body: "夕方がおすすめ",
      website: "",
    });
  });

  test("覚えたニックネームを初期値にする", async () => {
    window.localStorage.setItem(NICKNAME_STORAGE_KEY, "前の名前");
    stubFetch(Response.json(REVIEWS));
    render(<SpotReviewsSection spotId={SPOT_ID} />);
    await screen.findByText("安曇野の人");

    const form = openForm();
    expect(
      (within(form).getByLabelText("ニックネーム") as HTMLInputElement).value,
    ).toBe("前の名前");
  });

  test("星を選ばない・本文が長すぎるときは送らず、欄の下に理由を出す", async () => {
    const fetchMock = stubFetch(Response.json(REVIEWS));
    render(<SpotReviewsSection spotId={SPOT_ID} />);
    await screen.findByText("安曇野の人");

    const form = openForm();
    fillForm(form, { stars: 0, body: "あ".repeat(301) });
    expect(form.textContent).toContain("1文字多すぎます");
    fireEvent.submit(form);

    expect(
      await within(form).findByText("星は1〜5で選んでください"),
    ).toBeTruthy();
    expect(
      within(form).getByText("口コミは300文字以内にしてください"),
    ).toBeTruthy();
    expect(
      within(form).getByLabelText("口コミ").getAttribute("aria-invalid"),
    ).toBe("true");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("429 のときはフォームの上に API の文を出し、フォームは閉じない", async () => {
    stubFetch(
      Response.json(REVIEWS),
      Response.json(
        {
          error: "rate_limited",
          message: "続けて投稿されています。しばらくしてからお試しください",
        },
        { status: 429 },
      ),
    );
    render(<SpotReviewsSection spotId={SPOT_ID} />);
    await screen.findByText("安曇野の人");

    const form = openForm();
    fillForm(form);
    fireEvent.submit(form);

    expect((await within(form).findByRole("alert")).textContent).toBe(
      "続けて投稿されています。しばらくしてからお試しください",
    );
    expect(screen.getByRole("form", { name: "口コミを書く" })).toBeTruthy();
    expect(
      (within(form).getByLabelText("口コミ") as HTMLTextAreaElement).value,
    ).toBe("夕方がおすすめ");
  });

  test("400 の欄ごとの理由（NG ワードなど DB が断ったもの）を出す", async () => {
    stubFetch(
      Response.json(REVIEWS),
      Response.json(
        { error: "ng_word", message: "使えない言葉が含まれています" },
        { status: 400 },
      ),
    );
    render(<SpotReviewsSection spotId={SPOT_ID} />);
    await screen.findByText("安曇野の人");

    const form = openForm();
    fillForm(form);
    fireEvent.submit(form);

    expect((await within(form).findByRole("alert")).textContent).toBe(
      "使えない言葉が含まれています",
    );
  });

  test("通信できないときは、その旨を出す", async () => {
    stubFetch(Response.json(REVIEWS), new TypeError("Failed to fetch"));
    render(<SpotReviewsSection spotId={SPOT_ID} />);
    await screen.findByText("安曇野の人");

    const form = openForm();
    fillForm(form);
    fireEvent.submit(form);

    expect((await within(form).findByRole("alert")).textContent).toContain(
      "送れませんでした",
    );
  });

  test("星はラジオボタンなので、キーボードで選べる（名前は「星nつ」）", async () => {
    stubFetch(Response.json(REVIEWS));
    render(<SpotReviewsSection spotId={SPOT_ID} />);
    await screen.findByText("安曇野の人");

    const form = openForm();
    const group = within(form).getByRole("group", { name: "星（必須）" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("aria-label"))).toEqual([
      "星1つ",
      "星2つ",
      "星3つ",
      "星4つ",
      "星5つ",
    ]);
    // 同じ name のラジオボタンは、矢印キーで選ぶ（ブラウザの標準の動き）
    expect(new Set(radios.map((r) => r.getAttribute("name"))).size).toBe(1);
  });

  test("「やめる」でフォームを閉じる", async () => {
    stubFetch(Response.json(REVIEWS));
    render(<SpotReviewsSection spotId={SPOT_ID} />);
    await screen.findByText("安曇野の人");

    const form = openForm();
    fireEvent.click(within(form).getByRole("button", { name: "やめる" }));
    expect(screen.queryByRole("form", { name: "口コミを書く" })).toBeNull();
  });
});
