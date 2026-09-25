import { describe, expect, test } from "vitest";

import type { Spot } from "@/lib/data/spots";
import {
  generateCandidates,
  MAX_CANDIDATES,
  MAX_DAY_SPOTS,
  MIN_DAY_SPOTS,
  type PlannableArea,
} from "./generate";
import type { PlanCandidate, PlanDuration, PlanRequest } from "./types";

// --- フィクスチャ -------------------------------------------------------

function spot(
  areaId: string,
  name: string,
  category: string,
  {
    rating = 4.0,
    stay = 60,
    lat = 0,
    lng = 0,
  }: {
    rating?: number | null;
    stay?: number | null;
    lat?: number;
    lng?: number;
  } = {},
): Spot {
  return {
    id: `${areaId}/${name}`,
    area_id: areaId,
    name,
    category,
    lat,
    lng,
    rating,
    stay_minutes: stay,
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

/** 地域の中心のまわりに、カテゴリごとに1件ずつスポットを置く */
function area(
  id: string,
  center_lat: number,
  center_lng: number,
  categories: string[],
): PlannableArea {
  return {
    id,
    name: id,
    catchphrase: `${id}のキャッチコピー`,
    center_lat,
    center_lng,
    spots: categories.map((category, i) =>
      spot(id, `${id}の${category}${i}`, category, {
        lat: center_lat + i * 0.01,
        lng: center_lng,
      }),
    ),
  };
}

const EIGHT = [
  "gourmet",
  "nature",
  "view",
  "onsen",
  "craft",
  "history",
  "nature",
  "view",
];

// 北アルプス山麓（互いに 80km 以内）と、遠い地域
const matsumoto = area("松本市", 36.238, 137.972, EIGHT);
const azumino = area("安曇野市", 36.304, 137.906, EIGHT);
const omachi = area("大町市", 36.503, 137.851, EIGHT);
const hakuba = area("白馬村", 36.698, 137.862, EIGHT);
const far = area("遠い町", 43.06, 141.35, [
  "gourmet",
  "nature",
  "onsen",
  "view",
]);
const areas = [hakuba, omachi, azumino, matsumoto, far];

function request(overrides: Partial<PlanRequest> = {}): PlanRequest {
  return {
    areaId: null,
    duration: "day",
    interests: [],
    companion: "ひとり",
    transport: "車",
    ...overrides,
  };
}

const allRouteSpots = (candidate: PlanCandidate) =>
  candidate.days.flatMap((day) => day.route);

// --- テスト -------------------------------------------------------------

describe("generateCandidates", () => {
  test("「おまかせ」なら候補が複数（最大3件）返り、1地域につき1候補", () => {
    const candidates = generateCandidates(areas, request());

    expect(candidates).toHaveLength(MAX_CANDIDATES);
    expect(new Set(candidates.map((c) => c.id)).size).toBe(candidates.length);
    expect(candidates.every((c) => !c.nearby)).toBe(true);
  });

  test("「おまかせ」では、興味に合うスポットの多い地域を先に選ぶ", () => {
    const onsenTown = area("温泉の町", 36.4, 137.9, [
      "onsen",
      "onsen",
      "onsen",
      "nature",
    ]);

    const candidates = generateCandidates(
      [...areas, onsenTown],
      request({ interests: ["温泉"] }),
    );

    expect(candidates[0].id).toBe("温泉の町");
  });

  test("地域を選ぶと、1件目はその地域、2・3件目は近い地域になる", () => {
    const candidates = generateCandidates(areas, request({ areaId: "松本市" }));

    expect(candidates.map((c) => c.id)).toEqual([
      "松本市",
      "安曇野市",
      "大町市",
    ]);
    expect(candidates.map((c) => c.nearby)).toEqual([false, true, true]);
  });

  test("近い地域がなければ、選んだ地域の候補だけになる", () => {
    const candidates = generateCandidates(areas, request({ areaId: "遠い町" }));

    expect(candidates.map((c) => c.id)).toEqual(["遠い町"]);
  });

  test("知らない地域の id なら「おまかせ」として扱う", () => {
    const candidates = generateCandidates(
      areas,
      request({ areaId: "存在しない" }),
    );

    expect(candidates).toHaveLength(MAX_CANDIDATES);
  });

  test.each<[PlanDuration, number]>([
    ["day", 1],
    ["1n2d", 2],
    ["2n3d", 3],
  ])(
    "日程 %s では days が %i 日分で、1日のスポットは2〜4件",
    (duration, dayCount) => {
      const candidates = generateCandidates(areas, request({ duration }));

      expect(candidates.length).toBeGreaterThan(1);
      for (const candidate of candidates) {
        expect(candidate.duration).toBe(duration);
        expect(candidate.days.map((d) => d.day)).toEqual(
          Array.from({ length: dayCount }, (_, i) => i + 1),
        );
        for (const day of candidate.days) {
          expect(day.route.length).toBeGreaterThanOrEqual(MIN_DAY_SPOTS);
          expect(day.route.length).toBeLessThanOrEqual(MAX_DAY_SPOTS);
        }
      }
    },
  );

  test("各日の経路のスポットは、その日の地域のもの", () => {
    const candidates = generateCandidates(
      areas,
      request({ areaId: "松本市", duration: "2n3d" }),
    );

    for (const day of candidates.flatMap((c) => c.days)) {
      expect(day.route.every((s) => s.area_id === day.areaId)).toBe(true);
    }
  });

  test("1つの候補の中でスポットが重ならない", () => {
    const candidates = generateCandidates(areas, request({ duration: "2n3d" }));

    for (const candidate of candidates) {
      const ids = allRouteSpots(candidate).map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test("候補の地域で組めない日は、近い地域のスポットを使う", () => {
    // 松本市のスポットは5件なので、1日目に4件使うと2日目は組めない
    const smallMatsumoto = area("松本市", 36.238, 137.972, EIGHT.slice(0, 5));

    const [candidate] = generateCandidates(
      [smallMatsumoto, azumino, far],
      request({ areaId: "松本市", duration: "1n2d" }),
    );

    expect(candidate.days.map((d) => d.areaId)).toEqual(["松本市", "安曇野市"]);
    expect(candidate.reason).toContain("2日目は近くの安曇野市をめぐります。");
  });

  test("組めない候補は捨てる", () => {
    // 遠い町は4件しかなく近い地域もないので、2泊3日は組めない
    const candidates = generateCandidates(
      areas,
      request({ areaId: "遠い町", duration: "2n3d" }),
    );

    expect(candidates).toEqual([]);
  });

  test("スポットが2件未満の地域は候補にならない", () => {
    const tiny = area("小さな村", 36.25, 137.95, ["onsen"]);

    const candidates = generateCandidates(
      [tiny, matsumoto],
      request({ areaId: "小さな村" }),
    );

    expect(candidates.map((c) => c.id)).toEqual(["松本市"]);
  });

  test("興味に合うカテゴリのスポットを先に経路に入れる", () => {
    const [candidate] = generateCandidates(
      areas,
      request({ areaId: "松本市", interests: ["温泉", "歴史"] }),
    );

    const categories = candidate.days[0].route.map((s) => s.category);
    expect(categories).toContain("onsen");
    expect(categories).toContain("history");
  });

  test("興味が同じなら、評価の高いスポットを経路に入れる", () => {
    const town: PlannableArea = {
      ...area("評価の町", 36.238, 137.972, []),
      spots: [
        spot("評価の町", "低い", "nature", { rating: 2.0 }),
        spot("評価の町", "高い", "nature", { rating: 4.8 }),
        spot("評価の町", "評価なし", "nature", { rating: null }),
        spot("評価の町", "中くらい", "nature", { rating: 3.5 }),
        spot("評価の町", "やや低い", "nature", { rating: 3.0 }),
      ],
    };

    const [candidate] = generateCandidates(
      [town],
      request({ areaId: "評価の町" }),
    );

    expect(candidate.days[0].route.map((s) => s.name).sort()).toEqual(
      ["高い", "中くらい", "やや低い", "低い"].sort(),
    );
  });

  test("1日の所要時間は、滞在の合計と移動の目安から計算する", () => {
    const town: PlannableArea = {
      ...area("所要時間の町", 36.238, 137.972, []),
      spots: [
        spot("所要時間の町", "A", "nature", { stay: 30 }),
        spot("所要時間の町", "B", "nature", { stay: null }),
      ],
    };

    const [candidate] = generateCandidates(
      [town],
      request({ areaId: "所要時間の町", transport: "電車・バス" }),
    );

    expect(candidate.days[0].durationMinutes).toBe(30 + 60 + 40);
  });

  test("経路は近い順につなぐ", () => {
    // 評価の順（A → B → C）では行ったり来たりになるが、A から近い順なら A → C → B
    const town: PlannableArea = {
      ...area("経路の町", 36.0, 138.0, []),
      spots: [
        spot("経路の町", "A", "nature", { rating: 5.0, lat: 36.0 }),
        spot("経路の町", "B", "nature", { rating: 4.5, lat: 36.2 }),
        spot("経路の町", "C", "nature", { rating: 4.0, lat: 36.05 }),
      ],
    };

    const [candidate] = generateCandidates(
      [town],
      request({ areaId: "経路の町" }),
    );

    expect(candidate.days[0].route.map((s) => s.name)).toEqual(["A", "C", "B"]);
  });

  test("経路に入らなかったスポットは otherSpots に入る", () => {
    const [candidate] = generateCandidates(
      areas,
      request({ areaId: "松本市" }),
    );

    const routeIds = new Set(allRouteSpots(candidate).map((s) => s.id));
    expect(candidate.otherSpots).toHaveLength(8 - routeIds.size);
    expect(candidate.otherSpots.some((s) => routeIds.has(s.id))).toBe(false);
  });

  test("タイトル・説明・選ばれた理由を定型文で作る", () => {
    const candidates = generateCandidates(
      areas,
      request({ areaId: "松本市", duration: "1n2d", interests: ["温泉"] }),
    );

    expect(candidates[0]).toMatchObject({
      title: "松本市をめぐる1泊2日プラン",
      summary: "松本市のキャッチコピー",
      reason: "興味の「温泉」に合うスポットを、評価の高い順に選びました。",
    });
    expect(candidates[1].reason).toBe(
      "松本市の近くの地域から選びました。興味の「温泉」に合うスポットを、評価の高い順に選びました。",
    );
  });

  test("興味を選ばなければ、評価の高いスポットを選んだと書く", () => {
    const [candidate] = generateCandidates(areas, request());

    expect(candidate.reason).toBe("評価の高いスポットを選びました。");
  });
});
