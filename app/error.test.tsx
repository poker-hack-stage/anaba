import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import ErrorPage from "./error";

describe("ErrorPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("読み込めなかったことを伝え、エラーの中身は画面に出さない", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("connect ECONNREFUSED 127.0.0.1:54321");

    render(<ErrorPage error={error} retry={() => {}} />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("データを読み込めませんでした");
    expect(alert.textContent).not.toContain("ECONNREFUSED");
    expect(console.error).toHaveBeenCalledWith(error);
  });

  test("「もう一度読み込む」で retry を呼ぶ", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();

    render(<ErrorPage error={new Error("x")} retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "もう一度読み込む" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
