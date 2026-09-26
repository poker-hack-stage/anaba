import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SpotSubmissionProvider } from "@/components/submit/spot-submission";
import { BottomNav } from "./bottom-nav";
import { HeaderTabs } from "./header-tabs";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ refresh: vi.fn() }),
}));

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

describe("BottomNav の真ん中のボタン", () => {
  test("「穴場を探す」「穴場を教える」「AI旅プラン」の順に並び、真ん中はリンクではなくボタン", () => {
    render(<BottomNav />);

    const nav = screen.getByRole("navigation");
    const items = [...nav.querySelectorAll("a, button")].map((el) => [
      el.tagName,
      el.textContent,
    ]);
    expect(items).toEqual([
      ["A", "穴場を探す"],
      ["BUTTON", "穴場を教える"],
      ["A", "AI旅プラン"],
    ]);
    const button = within(nav).getByRole("button", { name: "穴場を教える" });
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    expect(button.hasAttribute("aria-current")).toBe(false);
  });

  test("「穴場を教える」はほかのタブと同じ高さにそろえ、ナビの上に飛び出させない（#163）", () => {
    render(<BottomNav />);

    const nav = screen.getByRole("navigation");
    const button = within(nav).getByRole("button", { name: "穴場を教える" });
    const tab = within(nav).getByRole("link", { name: "穴場を探す" });
    // jsdom は CSS を当てないので、高さを決めるクラスで比べる
    expect(button.classList.contains("min-h-11")).toBe(true);
    expect(tab.classList.contains("min-h-11")).toBe(true);
    expect(button.className).not.toMatch(/(^|\s)-mt-/);
  });

  test.each(["/", "/planner", "/credits", "/no-such-page"])(
    "%s でも、押すと「穴場を教える」のダイアログが開く",
    async (path) => {
      pathname.current = path;
      render(
        <SpotSubmissionProvider loadAreas={() => Promise.resolve(null)}>
          <BottomNav />
        </SpotSubmissionProvider>,
      );

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "穴場を教える" }));
      });

      expect(screen.getByRole("dialog", { name: "穴場を教える" })).toBeTruthy();
    },
  );
});
