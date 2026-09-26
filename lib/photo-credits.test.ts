import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { AI_IMAGE_DIR, isAiImagePath } from "./spots/image-kind";
import {
  AI_IMAGE_CREDITS,
  IMAGE_CREDITS,
  PHOTO_CREDITS,
  VIEW_OF_KAMIKAWA,
} from "./photo-credits";

const ROOT = join(__dirname, "..");

/** supabase/seed.sql に書いた image_path（null でないもの） */
function seedImagePaths(): string[] {
  const seed = readFileSync(join(ROOT, "supabase/seed.sql"), "utf8");
  return [...seed.matchAll(/'(\/images\/[^']+)'/g)].map((m) => m[1]);
}

describe("IMAGE_CREDITS", () => {
  test("どの画像も public/ にあり、300KB 以下", () => {
    for (const { path } of IMAGE_CREDITS) {
      const file = join(ROOT, "public", path);
      expect(existsSync(file), path).toBe(true);
      expect(statSync(file).size, path).toBeLessThanOrEqual(300_000);
    }
  });

  test("同じ画像を2回書いていない", () => {
    const paths = IMAGE_CREDITS.map((c) => c.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test("写真と AI の画像の一覧を合わせたもの", () => {
    expect(IMAGE_CREDITS).toHaveLength(
      PHOTO_CREDITS.length + AI_IMAGE_CREDITS.length,
    );
    expect(PHOTO_CREDITS.every((c) => c.kind === "photo")).toBe(true);
    expect(AI_IMAGE_CREDITS.every((c) => c.kind === "ai")).toBe(true);
  });

  test("AI の画像だけが AI の画像のフォルダにある（画面はパスで「イメージ（AI で生成）」を出す）", () => {
    for (const credit of IMAGE_CREDITS) {
      expect(isAiImagePath(credit.path), credit.path).toBe(
        credit.kind === "ai",
      );
    }
  });

  test("シードで使う画像には、必ず出典か生成の記録がある（出典のない画像を表示しない）", () => {
    const credited = new Set(IMAGE_CREDITS.map((c) => c.path));
    const used = seedImagePaths();
    expect(used.length).toBeGreaterThan(0);
    for (const path of used) expect(credited.has(path), path).toBe(true);
  });

  test("CC の写真にはライセンスの URL がある（パブリックドメインだけ null）", () => {
    for (const credit of PHOTO_CREDITS) {
      if (credit.license.startsWith("CC")) {
        expect(credit.licenseUrl, credit.path).toMatch(
          /^https:\/\/creativecommons\.org\//,
        );
      } else {
        expect(credit.licenseUrl, credit.path).toBeNull();
      }
      expect(credit.author, credit.path).not.toBe("");
    }
  });

  test("元の写真の URL が、出典のサイトのもの", () => {
    const prefix = {
      "Wikimedia Commons": /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/,
      Flickr: /^https:\/\/www\.flickr\.com\/photos\/[^/]+\/\d+$/,
      [VIEW_OF_KAMIKAWA]:
        /^https:\/\/www\.kamikawa\.pref\.hokkaido\.lg\.jp\/ts\/tss\/album\/\w+\/\d+\.html$/,
    };
    for (const credit of PHOTO_CREDITS) {
      expect(credit.sourceUrl, credit.path).toMatch(prefix[credit.sourceName]);
    }
  });

  test("Flickr の写真は CC BY か CC BY-SA だけ（NC・ND は使わない）", () => {
    for (const credit of PHOTO_CREDITS.filter(
      (c) => c.sourceName === "Flickr",
    )) {
      expect(credit.license, credit.path).toMatch(/^CC BY(-SA)? \d\.\d$/);
    }
  });

  test("どの写真にも元の題名がある（CC BY・CC BY-SA は題名の表示を求める）", () => {
    for (const credit of PHOTO_CREDITS) {
      expect(credit.title.trim(), credit.path).not.toBe("");
    }
  });

  test("Commons の写真の題名は、ファイルページの名前と同じ", () => {
    for (const credit of PHOTO_CREDITS.filter(
      (c) => c.sourceName === "Wikimedia Commons",
    )) {
      const fileName = credit.sourceUrl.split("/wiki/File:")[1];
      expect(credit.title, credit.path).toBe(
        decodeURIComponent(fileName).replaceAll("_", " "),
      );
    }
  });

  test("Flickr の写真の題名は、写真のページで確かめた題名（2026-09-26）", () => {
    const titles = Object.fromEntries(
      PHOTO_CREDITS.filter((c) => c.sourceName === "Flickr").map((c) => [
        c.sourceUrl,
        c.title,
      ]),
    );
    expect(titles).toEqual({
      "https://www.flickr.com/photos/154568645@N04/34658438162": "桜@貞麟寺",
      "https://www.flickr.com/photos/154568645@N04/34011672963":
        "リュウキンカ@居谷里湿原",
      "https://www.flickr.com/photos/13217899@N08/3507257327":
        "Japan North Alps",
      "https://www.flickr.com/photos/154568645@N04/34840653796":
        "桜@池田町 夢農場",
    });
  });
});

test("VIEW OF KAMIKAWA の写真は CC BY 4.0 で、題名は写真のページで確かめた題名（2026-09-26）", () => {
  const photos = PHOTO_CREDITS.filter((c) => c.sourceName === VIEW_OF_KAMIKAWA);
  for (const credit of photos) {
    expect(credit.license, credit.path).toBe("CC BY 4.0");
    expect(credit.author, credit.path).toBe("北海道上川総合振興局");
  }
  expect(Object.fromEntries(photos.map((c) => [c.sourceUrl, c.title]))).toEqual(
    {
      "https://www.kamikawa.pref.hokkaido.lg.jp/ts/tss/album/life/133087.html":
        "スプリング・エフェメラル２",
      "https://www.kamikawa.pref.hokkaido.lg.jp/ts/tss/album/view/133653.html":
        "旭岳源水",
      "https://www.kamikawa.pref.hokkaido.lg.jp/ts/tss/album/structure/132066.html":
        "北の住まい設計社１",
    },
  );
});

describe("AI_IMAGE_CREDITS", () => {
  test("モデル・プロンプトの要旨・生成した日がある", () => {
    for (const credit of AI_IMAGE_CREDITS) {
      expect(credit.path.startsWith(AI_IMAGE_DIR), credit.path).toBe(true);
      expect(credit.model.trim(), credit.path).not.toBe("");
      expect(credit.prompt.trim(), credit.path).not.toBe("");
      expect(credit.createdOn, credit.path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
