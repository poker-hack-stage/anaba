import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import ErrorPage from "./error";

describe("ErrorPage", () => {
  test("読み込めなかったことを伝える", () => {
    render(<ErrorPage retry={() => {}} />);

    expect(screen.getByRole("alert").textContent).toContain(
      "データを読み込めませんでした",
    );
  });

  test("「もう一度読み込む」で retry を呼ぶ", () => {
    const retry = vi.fn();

    render(<ErrorPage retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "もう一度読み込む" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
