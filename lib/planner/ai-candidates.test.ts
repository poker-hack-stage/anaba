import { describe, expect, test } from "vitest";

import {
  areas,
  azumino,
  far,
  matsumoto,
  omachi,
  request,
} from "@/test/fixtures/planner";
import { toPlanCandidates } from "./ai-candidates";
import { buildPlanPrompt } from "./ai-prompt";
import type { PlannableArea } from "./generate";
import type { AiPlan } from "./schema";
import type { PlanConditions } from "./types";

type AiCandidate = AiPlan["candidates"][number];

/**
 * 本当の地域・スポットで書いた候補を、プロンプトの記号に置き換えて toPlanCandidates() に通す。
 * spots はその日の地域のスポットの添字（ほかの地域のスポットは [地域, 添字]）。-1 は存在しないスポット
 */
function run(
  req: PlanConditions,
  candidates: {
    days: {
      area: PlannableArea;
      spots: (number | [PlannableArea, number])[];
    }[];
    title?: string;
    summary?: string;
    reason?: string;
  }[],
) {
  const prompt = buildPlanPrompt(areas, req);
  const keyOf = (map: Map<string, string>, id: string) =>
    [...map].find(([, value]) => value === id)?.[0] ?? "X999";

  const plan: AiPlan = {
    candidates: candidates.map((c): AiCandidate => ({
      title: c.title ?? "タイトル",
      summary: c.summary ?? "説明",
      reason: c.reason ?? "理由",
      days: c.days.map((d) => ({
        areaId: keyOf(prompt.areaIdByKey, d.area.id),
        spotIds: d.spots.map((s) => {
          const [spotArea, i] = typeof s === "number" ? [d.area, s] : s;
          return i < 0
            ? "S999"
            : keyOf(prompt.spotIdByKey, spotArea.spots[i].id);
        }),
      })),
    })),
  };
  return toPlanCandidates(plan, areas, req, prompt);
}

const names = (spots: { name: string }[]) => spots.map((s) => s.name);

describe("toPlanCandidates", () => {
  test("決まりに合う候補は、そのまま候補の形に戻す", () => {
    const req = request({ areaId: "松本市", transport: "自転車" });
    const [candidate] = run(req, [
      {
        days: [{ area: matsumoto, spots: [3, 0, 5] }],
        title: "松本の温泉めぐり",
        summary: "説明です",
        reason: "理由です",
      },
    ]);

    expect(candidate).toMatchObject({
      id: "松本市",
      areaName: "松本市",
      title: "松本の温泉めぐり",
      summary: "説明です",
      reason: "理由です",
      duration: "day",
      nearby: false,
    });
    expect(names(candidate.days[0].route)).toEqual(
      names([3, 0, 5].map((i) => matsumoto.spots[i])),
    );
    // 所要時間はサーバーで計算する: 滞在60分×3＋自転車の移動30分×2
    expect(candidate.days[0].durationMinutes).toBe(60 * 3 + 30 * 2);
    expect(candidate.otherSpots).toHaveLength(8 - 3);
  });

  test("存在しないスポットは取り除く", () => {
    const [candidate] = run(request(), [
      { days: [{ area: matsumoto, spots: [0, -1, 1] }] },
    ]);

    expect(names(candidate.days[0].route)).toEqual(
      names([matsumoto.spots[0], matsumoto.spots[1]]),
    );
  });

  test("その日の地域にないスポットは取り除く", () => {
    const [candidate] = run(request(), [
      { days: [{ area: matsumoto, spots: [0, [azumino, 0], 1] }] },
    ]);

    expect(names(candidate.days[0].route)).toEqual(
      names([matsumoto.spots[0], matsumoto.spots[1]]),
    );
  });

  test("候補の中で重なったスポットは取り除く", () => {
    const [candidate] = run(request({ duration: "1n2d" }), [
      {
        days: [
          { area: matsumoto, spots: [0, 1, 0] },
          { area: matsumoto, spots: [1, 2, 3] },
        ],
      },
    ]);

    expect(names(candidate.days[0].route)).toEqual(
      names([matsumoto.spots[0], matsumoto.spots[1]]),
    );
    expect(names(candidate.days[1].route)).toEqual(
      names([matsumoto.spots[2], matsumoto.spots[3]]),
    );
  });

  test("取り除いた結果、スポットが2件未満の日ができたら候補ごと捨てる", () => {
    const candidates = run(request(), [
      { days: [{ area: matsumoto, spots: [0, -1, -1] }] },
      { days: [{ area: azumino, spots: [0, 1] }] },
    ]);

    expect(candidates.map((c) => c.id)).toEqual(["安曇野市"]);
  });

  test("1日のスポットは4件までにする", () => {
    const [candidate] = run(request(), [
      { days: [{ area: matsumoto, spots: [0, 1, 2, 3, 4, 5] }] },
    ]);

    expect(candidate.days[0].route).toHaveLength(4);
  });

  test("日数が日程より少なければ捨て、多ければ切る", () => {
    const req = request({ duration: "1n2d" });
    const candidates = run(req, [
      { days: [{ area: matsumoto, spots: [0, 1] }] },
      {
        days: [
          { area: azumino, spots: [0, 1] },
          { area: azumino, spots: [2, 3] },
          { area: azumino, spots: [4, 5] },
        ],
      },
    ]);

    expect(candidates.map((c) => c.id)).toEqual(["安曇野市"]);
    expect(candidates[0].days.map((d) => d.day)).toEqual([1, 2]);
  });

  test("2日目以降は、1日目の地域の近い地域なら使える。遠い地域なら捨てる", () => {
    const req = request({ duration: "1n2d" });
    const candidates = run(req, [
      {
        days: [
          { area: matsumoto, spots: [0, 1] },
          { area: azumino, spots: [0, 1] },
        ],
      },
      {
        days: [
          { area: omachi, spots: [0, 1] },
          { area: far, spots: [0, 1] },
        ],
      },
    ]);

    expect(candidates.map((c) => c.id)).toEqual(["松本市"]);
    expect(candidates[0].days.map((d) => d.areaId)).toEqual([
      "松本市",
      "安曇野市",
    ]);
  });

  test("1日目の地域が候補にできない地域なら捨て、ほかの候補と重なれば後ろを捨てる", () => {
    const candidates = run(request({ areaId: "松本市" }), [
      { days: [{ area: matsumoto, spots: [0, 1] }] },
      // 日帰りで松本市を選んだときは、遠い町は候補にできない
      { days: [{ area: far, spots: [0, 1] }] },
      { days: [{ area: matsumoto, spots: [2, 3] }] },
      { days: [{ area: azumino, spots: [0, 1] }] },
    ]);

    expect(candidates.map((c) => c.id)).toEqual(["松本市", "安曇野市"]);
    expect(candidates.map((c) => c.nearby)).toEqual([false, true]);
  });

  test("選んだ地域の候補を1件目にする。なければ全部を捨てる", () => {
    const req = request({ areaId: "松本市" });

    expect(
      run(req, [
        { days: [{ area: azumino, spots: [0, 1] }] },
        { days: [{ area: matsumoto, spots: [0, 1] }] },
      ]).map((c) => c.id),
    ).toEqual(["松本市", "安曇野市"]);

    expect(run(req, [{ days: [{ area: azumino, spots: [0, 1] }] }])).toEqual(
      [],
    );
  });

  test("候補は3件までにする", () => {
    const candidates = run(
      request(),
      areas.map((a) => ({ days: [{ area: a, spots: [0, 1] }] })),
    );

    expect(candidates).toHaveLength(3);
  });

  test("文章からプロンプトの記号を消し、空なら定型文にする", () => {
    const [candidate] = run(request({ areaId: "松本市" }), [
      {
        days: [{ area: matsumoto, spots: [0, 1] }],
        title: "  ",
        summary: "",
        reason: "松本市（A5）と安曇野市(A4)を選びました。A5ランクの和牛も。",
      },
    ]);

    expect(candidate.title).toBe("松本市をめぐる日帰りプラン");
    expect(candidate.summary).toBe("松本市のキャッチコピー");
    expect(candidate.reason).toBe(
      "松本市と安曇野市を選びました。A5ランクの和牛も。",
    );
  });
});

describe("toPlanCandidates: 必ず入れるスポット（#32）", () => {
  test("そのスポットがどの日の経路にもない候補は捨てる", () => {
    const req = request({
      duration: "1n2d",
      includeSpotId: matsumoto.spots[7].id,
    });

    const candidates = run(req, [
      {
        days: [
          { area: azumino, spots: [0, 1] },
          { area: matsumoto, spots: [7, 0] },
        ],
      },
      {
        days: [
          { area: omachi, spots: [0, 1] },
          { area: omachi, spots: [2, 3] },
        ],
      },
    ]);

    expect(candidates.map((c) => c.id)).toEqual(["安曇野市"]);
  });

  test("日帰りで選んだ地域では入れられないスポットなら、全部を捨てずに近い地域の候補を返す", () => {
    const req = request({
      areaId: "松本市",
      includeSpotId: azumino.spots[7].id,
    });

    const candidates = run(req, [{ days: [{ area: azumino, spots: [7, 0] }] }]);

    expect(candidates.map((c) => [c.id, c.nearby])).toEqual([
      ["安曇野市", true],
    ]);
  });

  test("選んだ地域で入れられるなら、選んだ地域の候補がなければ全部を捨てる（今までどおり）", () => {
    const req = request({
      areaId: "松本市",
      duration: "1n2d",
      includeSpotId: matsumoto.spots[7].id,
    });

    const candidates = run(req, [
      {
        days: [
          { area: azumino, spots: [0, 1] },
          { area: matsumoto, spots: [7, 0] },
        ],
      },
    ]);

    expect(candidates).toEqual([]);
  });
});
