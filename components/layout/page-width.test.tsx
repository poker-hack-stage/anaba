import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { PAGE_CONTAINER } from "./page-width";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("PAGE_CONTAINER", () => {
  test("最大 1600px で、2xl 以上だけ左右の余白を増やす", () => {
    const classes = PAGE_CONTAINER.split(" ");

    expect(classes).toContain("max-w-[1600px]");
    expect(classes).toContain("lg:px-8");
    expect(classes).toContain("2xl:px-12");
  });

  test("ヘッダーとフッターが同じ幅のクラスを使う", () => {
    render(
      <>
        <SiteHeader />
        <SiteFooter />
      </>,
    );

    const headerInner = screen.getByRole("banner").firstElementChild;
    const footer = screen.getByRole("contentinfo");
    for (const element of [headerInner, footer]) {
      for (const cls of PAGE_CONTAINER.split(" ")) {
        expect(element?.classList.contains(cls)).toBe(true);
      }
    }
  });
});
