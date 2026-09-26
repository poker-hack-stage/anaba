import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { Select } from "./select";

describe("Select", () => {
  test("label で引け、optgroup でまとめた選択肢を選ぶと onChange に値が渡る", () => {
    const onChange = vi.fn();
    render(
      <>
        <label htmlFor="area">エリア</label>
        <Select id="area" defaultValue="" onChange={onChange}>
          <option value="">地域を選ぶ</option>
          <optgroup label="長野県">
            <option value="matsumoto">松本市</option>
          </optgroup>
        </Select>
      </>,
    );
    const select = screen.getByLabelText<HTMLSelectElement>("エリア");

    expect(select.tagName).toBe("SELECT");
    expect(select.querySelector("optgroup")?.label).toBe("長野県");

    fireEvent.change(select, { target: { value: "matsumoto" } });
    expect(onChange).toHaveBeenCalledOnce();
    expect(select.value).toBe("matsumoto");
  });

  test("className は select に、containerClassName は外側の枠に付く", () => {
    render(
      <Select
        aria-label="エリア"
        className="border-stone-900"
        containerClassName="flex-1"
      >
        <option>松本市</option>
      </Select>,
    );
    const select = screen.getByRole("combobox", { name: "エリア" });

    expect(select.className).toContain("border-stone-900");
    // 既定の枠の色は、渡した色で上書きされる
    expect(select.className).not.toContain("border-input");
    expect(select.parentElement?.className).toContain("flex-1");
  });

  test("disabled を select に渡す", () => {
    render(
      <Select aria-label="エリア" disabled>
        <option>松本市</option>
      </Select>,
    );

    expect(
      screen.getByRole<HTMLSelectElement>("combobox", { name: "エリア" })
        .disabled,
    ).toBe(true);
  });

  test("pill の形は、iOS で拡大されないよう sm 未満だけ 16px にする", () => {
    render(
      <>
        <Select aria-label="ピル" shape="pill">
          <option>松本市</option>
        </Select>
        <Select aria-label="既定">
          <option>松本市</option>
        </Select>
      </>,
    );
    const pill = screen.getByRole("combobox", { name: "ピル" }).className;
    const base = screen.getByRole("combobox", { name: "既定" }).className;

    expect(pill).toContain("text-xs");
    expect(pill).toContain("max-sm:text-base");
    // 既定の形は、もとから 16px（md 以上で 14px）
    expect(base).toContain("text-base");
    expect(base).not.toContain("max-sm:text-base");
  });
});
