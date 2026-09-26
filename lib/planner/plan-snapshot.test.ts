import { describe, expect, test } from "vitest";

import type { Spot } from "@/lib/data/spots";
import { routeSpotIds } from "./plan-snapshot";
import type { PlanCandidate } from "./types";

const route = (...ids: string[]) => ids.map((id) => ({ id }) as Spot);

describe("routeSpotIds", () => {
  test("経路のスポットの id を、日ごとにめぐる順で並べる", () => {
    const candidate = {
      days: [
        { day: 1, route: route("a/1", "a/2") },
        { day: 2, route: route("b/1", "b/3", "b/2") },
      ],
    } as PlanCandidate;

    expect(routeSpotIds(candidate)).toEqual([
      ["a/1", "a/2"],
      ["b/1", "b/3", "b/2"],
    ]);
  });
});
