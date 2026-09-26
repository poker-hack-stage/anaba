import { describe, expect, test } from "vitest";
import { isAiImagePath } from "./image-kind";

describe("isAiImagePath", () => {
  test("AI の画像のフォルダの画像だけを AI の画像として扱う", () => {
    expect(isAiImagePath("/images/spots/ai/hakuba-05.jpg")).toBe(true);
    expect(isAiImagePath("/images/spots/hakuba-01.jpg")).toBe(false);
    expect(isAiImagePath("/images/spots/ai-hakuba.jpg")).toBe(false);
    expect(isAiImagePath(null)).toBe(false);
    expect(isAiImagePath(undefined)).toBe(false);
    expect(isAiImagePath("")).toBe(false);
  });
});
