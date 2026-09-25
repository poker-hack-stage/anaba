import { describe, expect, test } from "vitest";

import {
  filterAreas,
  hasActiveFilter,
  MAX_QUERY_LENGTH,
  normalizeText,
  parseKeywords,
  type FilterableArea,
  type FilterableSpot,
} from "./filter";
import { pickRecommended } from "./recommend";

function spot(
  name: string,
  category: string,
  fields: Partial<FilterableSpot> = {},
): FilterableSpot {
  return {
    name,
    category,
    rating: null,
    tags: [],
    catchphrase: null,
    description: null,
    ...fields,
  };
}

function area(
  name: string,
  spots: FilterableSpot[],
  prefecture?: string,
): FilterableArea {
  return { name, prefecture, spots, recommended: pickRecommended(spots) };
}

const areaNames = (areas: { name: string }[]) => areas.map((a) => a.name);
const spotNames = (spots: readonly { name: string }[]) =>
  spots.map((s) => s.name);

// display_order の順に並んでいる前提のフィクスチャ
const AREAS = [
  area(
    "安曇野",
    [
      spot("大王わさび農場", "nature", {
        rating: 4.5,
        tags: ["わさび", "湧水"],
      }),
      spot("碌山美術館", "history", { rating: 4.0, tags: ["美術館"] }),
      spot("しゃくなげの湯", "onsen", {
        rating: 3.5,
        catchphrase: "北アルプスを望む露天風呂",
      }),
      spot("安曇野カフェ", "gourmet", {
        rating: 3.0,
        description: "ソバ粉のガレットが名物",
      }),
    ],
    "長野県",
  ),
  area(
    "松本",
    [
      spot("松本城", "history", { rating: 4.8, tags: ["城", "国宝"] }),
      spot("美ヶ原温泉", "onsen", { rating: 4.2, tags: ["温泉街"] }),
      spot("中町通り", "history", { rating: 3.9, tags: ["蔵"] }),
    ],
    "長野県",
  ),
  area(
    "大町",
    [
      spot("木崎湖", "view", { rating: 4.1, tags: ["湖", "SUP"] }),
      spot("葛温泉", "onsen", { rating: 4.0, tags: ["秘湯"] }),
    ],
    "長野県",
  ),
  area(
    "尾道",
    [spot("千光寺", "history", { rating: 4.3, tags: ["坂の町"] })],
    "広島県",
  ),
];

describe("normalizeText", () => {
  test("全角英数を半角に、英字を小文字に、カタカナをひらがなにそろえる", () => {
    expect(normalizeText("ＳＵＰ")).toBe("sup");
    expect(normalizeText("ＡＢＣ１２３")).toBe("abc123");
    expect(normalizeText("カフェ")).toBe("かふぇ");
    expect(normalizeText("ｶﾞﾚｯﾄ")).toBe("がれっと");
    expect(normalizeText("ヴィラ")).toBe("ゔぃら");
  });

  test("小さい「ヶ」「ヵ」を「け」「か」にそろえる", () => {
    expect(normalizeText("美ヶ原")).toBe(normalizeText("美ケ原"));
    expect(normalizeText("三ヵ月")).toBe(normalizeText("三カ月"));
  });
});

describe("parseKeywords", () => {
  test("空白（全角も）で語に分け、空の語は捨てる", () => {
    expect(parseKeywords("  松本　温泉  ")).toEqual(["松本", "温泉"]);
    expect(parseKeywords("   ")).toEqual([]);
    expect(parseKeywords("")).toEqual([]);
    expect(parseKeywords(undefined)).toEqual([]);
  });

  test(`${MAX_QUERY_LENGTH} 文字までで切る`, () => {
    const long = "あ".repeat(MAX_QUERY_LENGTH) + "い";

    expect(parseKeywords(long)).toEqual(["あ".repeat(MAX_QUERY_LENGTH)]);
  });

  test("サロゲートペアの途中で切れても半端な文字を残さない", () => {
    const q = "あ".repeat(MAX_QUERY_LENGTH - 1) + "🍵";

    expect(parseKeywords(q)).toEqual(["あ".repeat(MAX_QUERY_LENGTH - 1)]);
  });
});

describe("hasActiveFilter", () => {
  test("キーワードが空白だけでカテゴリもなければ false", () => {
    expect(hasActiveFilter({})).toBe(false);
    expect(hasActiveFilter({ q: " 　 ", categories: [] })).toBe(false);
    expect(hasActiveFilter({ q: "城" })).toBe(true);
    expect(hasActiveFilter({ categories: ["onsen"] })).toBe(true);
  });

  test("カテゴリの空文字は条件に数えない", () => {
    expect(hasActiveFilter({ categories: [""] })).toBe(false);
    expect(hasActiveFilter({ categories: ["", "onsen"] })).toBe(true);
  });
});

describe("filterAreas", () => {
  test("条件が空なら全地域を今のおすすめのまま返す", () => {
    for (const filter of [
      {},
      { q: "  　", categories: [] },
      { categories: [""] },
    ]) {
      const result = filterAreas(AREAS, filter);

      expect(areaNames(result)).toEqual(areaNames(AREAS));
      result.forEach((a, i) => {
        expect(a.recommended).toEqual(AREAS[i].recommended);
        expect(a.matchedSpots).toEqual(AREAS[i].spots);
      });
    }
  });

  test("キーワードがスポット名に当たる", () => {
    const result = filterAreas(AREAS, { q: "松本城" });

    expect(areaNames(result)).toEqual(["松本"]);
    expect(spotNames(result[0].matchedSpots)).toEqual(["松本城"]);
  });

  test("キーワードがタグに当たる", () => {
    const result = filterAreas(AREAS, { q: "秘湯" });

    expect(areaNames(result)).toEqual(["大町"]);
    expect(spotNames(result[0].matchedSpots)).toEqual(["葛温泉"]);
  });

  test("キーワードがキャッチコピーと説明に当たる", () => {
    expect(
      spotNames(filterAreas(AREAS, { q: "露天風呂" })[0].matchedSpots),
    ).toEqual(["しゃくなげの湯"]);
    expect(
      spotNames(filterAreas(AREAS, { q: "ガレット" })[0].matchedSpots),
    ).toEqual(["安曇野カフェ"]);
  });

  test("キーワードが地域名に当たると、その地域のスポットがすべて一致する", () => {
    // 大町のスポット名・タグには「大町」を含まない
    const result = filterAreas(AREAS, { q: "大町" });

    expect(areaNames(result)).toEqual(["大町"]);
    expect(spotNames(result[0].matchedSpots)).toEqual(["木崎湖", "葛温泉"]);
  });

  test("キーワードが都道府県に当たる", () => {
    expect(areaNames(filterAreas(AREAS, { q: "広島" }))).toEqual(["尾道"]);
    expect(areaNames(filterAreas(AREAS, { q: "長野県" }))).toEqual([
      "安曇野",
      "松本",
      "大町",
    ]);
  });

  test("都道府県の列がない地域でも落ちない", () => {
    const areas = [area("無名の地域", [spot("滝", "nature")])];

    expect(areaNames(filterAreas(areas, { q: "滝" }))).toEqual(["無名の地域"]);
    expect(filterAreas(areas, { q: "長野" })).toEqual([]);
  });

  test("全角と半角・大文字と小文字の違いを吸収する", () => {
    for (const q of ["sup", "ＳＵＰ", "Sup", "ｓｕｐ"]) {
      expect(areaNames(filterAreas(AREAS, { q }))).toEqual(["大町"]);
    }
  });

  test("カタカナとひらがなの違いを吸収する", () => {
    // データはカタカナ「ソバ」・ひらがな「わさび」
    expect(
      spotNames(filterAreas(AREAS, { q: "そば" })[0].matchedSpots),
    ).toEqual(["安曇野カフェ"]);
    expect(
      spotNames(filterAreas(AREAS, { q: "ワサビ" })[0].matchedSpots),
    ).toEqual(["大王わさび農場"]);
    expect(spotNames(filterAreas(AREAS, { q: "ｶﾌｪ" })[0].matchedSpots)).toEqual(
      ["安曇野カフェ"],
    );
  });

  test("「ヶ」と「ケ」の違いを吸収する", () => {
    // データは「美ヶ原温泉」
    expect(
      spotNames(filterAreas(AREAS, { q: "美ケ原" })[0].matchedSpots),
    ).toEqual(["美ヶ原温泉"]);
  });

  test("空白で区切った語はすべて含むスポットだけに当たる（AND）", () => {
    // 「松本」は地域名、「温泉」はスポット名・タグ。項目がまたがってもよい
    const result = filterAreas(AREAS, { q: "松本　温泉" });

    expect(areaNames(result)).toEqual(["松本"]);
    expect(spotNames(result[0].matchedSpots)).toEqual(["美ヶ原温泉"]);
    expect(filterAreas(AREAS, { q: "松本 秘湯" })).toEqual([]);
  });

  test("カテゴリは選んだもののどれかに当たる（OR）", () => {
    const result = filterAreas(AREAS, { categories: ["view", "gourmet"] });

    expect(areaNames(result)).toEqual(["安曇野", "大町"]);
    expect(spotNames(result[0].matchedSpots)).toEqual(["安曇野カフェ"]);
    expect(spotNames(result[1].matchedSpots)).toEqual(["木崎湖"]);
  });

  test("カテゴリとキーワードは両方に当たるスポットだけ（AND）", () => {
    const result = filterAreas(AREAS, { q: "長野", categories: ["onsen"] });

    expect(areaNames(result)).toEqual(["安曇野", "松本", "大町"]);
    expect(result.map((a) => spotNames(a.matchedSpots))).toEqual([
      ["しゃくなげの湯"],
      ["美ヶ原温泉"],
      ["葛温泉"],
    ]);
    expect(filterAreas(AREAS, { q: "城", categories: ["onsen"] })).toEqual([]);
  });

  test("カテゴリの空文字は捨て、残りのカテゴリで絞る", () => {
    const result = filterAreas(AREAS, { categories: ["", "view"] });

    expect(areaNames(result)).toEqual(["大町"]);
    expect(spotNames(result[0].matchedSpots)).toEqual(["木崎湖"]);
  });

  test("一致が0件なら空配列", () => {
    expect(filterAreas(AREAS, { q: "存在しないスポット" })).toEqual([]);
    expect(filterAreas(AREAS, { categories: ["craft"] })).toEqual([]);
    expect(filterAreas([], { q: "城" })).toEqual([]);
  });

  test("おすすめは一致したスポットから選び直す", () => {
    const result = filterAreas(AREAS, { categories: ["history"] });
    const matsumoto = result.find((a) => a.name === "松本");

    expect(spotNames(matsumoto!.recommended)).toEqual(["松本城", "中町通り"]);
  });

  test("一致したスポットが3件未満の地域でも落ちず、ある分だけおすすめにする", () => {
    const result = filterAreas(AREAS, { q: "温泉" });

    expect(areaNames(result)).toEqual(["松本", "大町"]);
    expect(spotNames(result[0].recommended)).toEqual(["美ヶ原温泉"]);
    expect(spotNames(result[1].recommended)).toEqual(["葛温泉"]);
  });

  test("一致が3件より多ければおすすめは3件", () => {
    const result = filterAreas(AREAS, { q: "安曇野" });

    expect(result[0].matchedSpots).toHaveLength(4);
    expect(spotNames(result[0].recommended)).toEqual([
      "大王わさび農場",
      "碌山美術館",
      "しゃくなげの湯",
    ]);
  });

  test("地域の並び（display_order）を変えない", () => {
    const reversed = [...AREAS].reverse();

    expect(areaNames(filterAreas(reversed, { q: "長野" }))).toEqual([
      "大町",
      "松本",
      "安曇野",
    ]);
  });

  test("地域のほかの列を残す", () => {
    const areas = [
      { ...area("松本", [spot("松本城", "history")]), id: "a1", zoom: 12 },
    ];

    const [result] = filterAreas(areas, { q: "城" });

    expect(result.id).toBe("a1");
    expect(result.zoom).toBe(12);
    expect(result.spots).toBe(areas[0].spots);
  });

  test("渡した配列と地域を書き換えない", () => {
    const before = structuredClone(AREAS);

    filterAreas(AREAS, { q: "温泉", categories: ["onsen"] });
    filterAreas(AREAS, {});

    expect(AREAS).toEqual(before);
  });
});
