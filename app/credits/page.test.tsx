import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

// AI の画像の欄を確かめるため、AI の画像を1件だけ持つ一覧に差し替える
vi.mock("@/lib/photo-credits", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/photo-credits")>();
  return {
    ...actual,
    AI_IMAGE_CREDITS: [
      {
        kind: "ai",
        path: "/images/spots/ai/test-01.jpg",
        subject: "テストの工房",
        model: "テストのモデル",
        prompt: "山あいの工房のイメージ",
        createdOn: "2026-09-26",
      },
    ],
  };
});

import CreditsPage from "./page";

describe("CreditsPage", () => {
  test("写真の出典を撮影者・ライセンスとともに出す", () => {
    render(<CreditsPage />);

    expect(screen.getByText("白馬塩の道温泉 倉下の湯")).toBeTruthy();
    expect(screen.getAllByText(/撮影: Qurren/).length).toBeGreaterThan(0);
  });

  test("AI の画像は、モデルとプロンプトの要旨を出す", () => {
    render(<CreditsPage />);

    expect(
      screen.getByRole("heading", { name: "AI で生成したイメージ画像" }),
    ).toBeTruthy();
    expect(screen.getByText("テストの工房")).toBeTruthy();
    expect(screen.getByText(/モデル: テストのモデル/)).toBeTruthy();
    expect(
      screen.getByText("プロンプトの要旨: 山あいの工房のイメージ"),
    ).toBeTruthy();
  });
});
