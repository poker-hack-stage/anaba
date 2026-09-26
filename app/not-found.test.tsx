import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import NotFound from "./not-found";

describe("NotFound", () => {
  test("見つからなかったことを日本語で伝える", () => {
    render(<NotFound />);

    expect(screen.getByText("ページが見つかりませんでした")).toBeTruthy();
  });

  test("「穴場を探す」でトップへ戻れる", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("link", { name: "穴場を探す" }).getAttribute("href"),
    ).toBe("/");
  });

  test("大きい画面でも読みやすい幅（写真の出典と同じ max-w-3xl）に収める", () => {
    const { container } = render(<NotFound />);

    expect(container.firstElementChild?.classList.contains("max-w-3xl")).toBe(
      true,
    );
  });
});
