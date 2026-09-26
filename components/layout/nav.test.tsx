import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { BottomNav } from "./bottom-nav";
import { HeaderTabs } from "./header-tabs";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

beforeEach(() => {
  pathname.current = "/";
});

describe.each([
  ["HeaderTabs", HeaderTabs],
  ["BottomNav", BottomNav],
])("%s", (_, Nav) => {
  test("今いるタブにだけ aria-current=page を付ける", () => {
    pathname.current = "/planner";
    render(<Nav />);

    expect(
      screen
        .getByRole("link", { name: "AI旅プラン" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen
        .getByRole("link", { name: "穴場を探す" })
        .hasAttribute("aria-current"),
    ).toBe(false);
  });

  test("どのタブにも当たらないページ（404 など）では付けない", () => {
    pathname.current = "/no-such-page";
    render(<Nav />);

    for (const link of screen.getAllByRole("link")) {
      expect(link.hasAttribute("aria-current")).toBe(false);
    }
  });
});
