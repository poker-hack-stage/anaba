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
});
