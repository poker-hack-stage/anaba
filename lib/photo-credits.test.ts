import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { PHOTO_CREDITS } from "./photo-credits";

const ROOT = join(__dirname, "..");

/** supabase/seed.sql に書いた image_path（null でないもの） */
function seedImagePaths(): string[] {
  const seed = readFileSync(join(ROOT, "supabase/seed.sql"), "utf8");
  return [...seed.matchAll(/'(\/images\/[^']+)'/g)].map((m) => m[1]);
}

describe("PHOTO_CREDITS", () => {
  test("どの写真も public/ にあり、300KB 以下", () => {
    for (const { path } of PHOTO_CREDITS) {
      const file = join(ROOT, "public", path);
      expect(existsSync(file), path).toBe(true);
      expect(statSync(file).size, path).toBeLessThanOrEqual(300_000);
    }
  });

  test("同じ写真を2回書いていない", () => {
    const paths = PHOTO_CREDITS.map((c) => c.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test("シードで使う写真には、必ず出典がある（出典のない写真を表示しない）", () => {
    const credited = new Set(PHOTO_CREDITS.map((c) => c.path));
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
