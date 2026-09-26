import { describe, expect, test } from "vitest";

import { INTEREST_TO_CATEGORY } from "@/lib/planner/generate";
import { COMPANIONS, INTERESTS, TRANSPORTS } from "@/lib/planner/options";
import { CATEGORIES } from "@/lib/spots/categories";
import {
  COMPANION_ICONS,
  INTEREST_ICONS,
  TRANSPORT_ICONS,
} from "./condition-icons";

describe("条件のチップのアイコン（#148）", () => {
  test("興味のあることは、「穴場を探す」のカテゴリと同じアイコン", () => {
    for (const interest of INTERESTS) {
      expect(INTEREST_ICONS[interest]).toBe(
        CATEGORIES[INTEREST_TO_CATEGORY[interest]].icon,
      );
    }
  });

  test("選択肢ごとに違うアイコン", () => {
    for (const icons of [
      INTERESTS.map((i) => INTEREST_ICONS[i]),
      COMPANIONS.map((c) => COMPANION_ICONS[c]),
      TRANSPORTS.map((t) => TRANSPORT_ICONS[t]),
    ]) {
      expect(new Set(icons).size).toBe(icons.length);
    }
  });
});
