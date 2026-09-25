import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { SpotImage, isSpotImagePath, preloadSpotImage } from "./spot-image";

describe("SpotImage", () => {
  test("image_path があれば写真を出す", () => {
    const { container } = render(
      <SpotImage
        category="onsen"
        imagePath="/images/spots/yu.jpg"
        sizes="96px"
      />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toContain(
      encodeURIComponent("/images/spots/yu.jpg"),
    );
    expect(img?.getAttribute("sizes")).toBe("96px");
  });

  test("image_path がなければ写真を出さない（プレースホルダーだけ）", () => {
    const { container } = render(
      <SpotImage category="onsen" imagePath={null} sizes="96px" />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  test("写真を読み込めなかったら、プレースホルダーに戻す", () => {
    const { container } = render(
      <SpotImage
        category="onsen"
        imagePath="/images/spots/missing.jpg"
        sizes="96px"
      />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

describe("isSpotImagePath", () => {
  test("public/ からのパスだけを写真として扱う", () => {
    expect(isSpotImagePath("/images/spots/a.jpg")).toBe(true);
    expect(isSpotImagePath("https://example.com/a.jpg")).toBe(false);
    expect(isSpotImagePath("//example.com/a.jpg")).toBe(false);
    expect(isSpotImagePath("images/a.jpg")).toBe(false);
    expect(isSpotImagePath("")).toBe(false);
    expect(isSpotImagePath(null)).toBe(false);
  });
});

describe("preloadSpotImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubImage() {
    const created: { sizes: string; srcset: string; src: string }[] = [];
    vi.stubGlobal(
      "Image",
      class {
        sizes = "";
        srcset = "";
        src = "";
        constructor() {
          created.push(this);
        }
      },
    );
    return created;
  }

  test("next/image と同じ srcset・sizes で読み込む", () => {
    const created = stubImage();
    preloadSpotImage("/images/spots/yu.jpg", "96px");
    expect(created).toHaveLength(1);
    expect(created[0].sizes).toBe("96px");
    expect(created[0].srcset).toContain(
      encodeURIComponent("/images/spots/yu.jpg"),
    );
    expect(created[0].src).toContain(
      encodeURIComponent("/images/spots/yu.jpg"),
    );
  });

  test("写真がなければ何も読まない", () => {
    const created = stubImage();
    preloadSpotImage(null, "96px");
    preloadSpotImage("https://example.com/a.jpg", "96px");
    expect(created).toHaveLength(0);
  });
});
