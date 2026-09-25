// MapLibre の Web Worker を public/maplibre/ に写す（npm ci / npm install のあとと、npm run dev / build の前に自動で動く）。
// install のあとにも写すので、Vercel の Build Command を next build に変えてもファイルはできている
// MapLibre v6 はワーカーの URL を実行時に組み立てるため、バンドラー（Turbopack）がワーカーのファイルを出力に含めない。
// そのままだと地図の背景が描かれないので、ここで写したファイルを spot-map.tsx の setWorkerUrl で指す。
// 写したファイルはコミットしない（.gitignore）
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = dirname(require.resolve("maplibre-gl/dist/maplibre-gl.css"));
const out = join(root, "public", "maplibre");

mkdirSync(out, { recursive: true });
// ワーカーは同じフォルダーの maplibre-gl-shared.mjs を import するので、両方写す
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(dist, file), join(out, file));
}
