// 地域（areas）の境界を国土数値情報の行政区域データ（N03）から作り、supabase/seed.sql に書く（#10）。
// 手順・出典・ライセンスは docs/boundaries.md。
//
//   node scripts/boundaries/build.mjs            # ダウンロード（キャッシュがなければ）→ 間引き → seed.sql を更新
//   node scripts/boundaries/build.mjs --check    # seed.sql を書き換えず、サイズの確認だけ
//
// 必要なもの: Node.js 22、unzip コマンド、ネットワーク（初回のみ。npx で mapshaper を取得する）。
// ダウンロードしたファイルは OS の一時ディレクトリ（N03_CACHE_DIR で変更可）に置き、リポジトリには入れない。

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const N03_VERSION = "N03-2025";
const N03_DATE = "20250101";
const MAPSHAPER = "mapshaper@0.6.121";

// seed.sql の areas と同じ固定 id。code は N03_007（全国地方公共団体コードの5桁）。
// fine = 北アルプス山麓（細かめ、1地域 25KB 以下）、coarse = ほかの地域（粗め、1地域 10KB 以下）。
const AREAS = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    pref: "長野県",
    name: "白馬村",
    code: "20485",
    group: "fine",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    pref: "長野県",
    name: "大町市",
    code: "20212",
    group: "fine",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    pref: "長野県",
    name: "池田町",
    code: "20481",
    group: "fine",
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    pref: "長野県",
    name: "安曇野市",
    code: "20220",
    group: "fine",
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    pref: "長野県",
    name: "松本市",
    code: "20202",
    group: "fine",
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    pref: "北海道",
    name: "東川町",
    code: "01458",
    group: "coarse",
  },
  {
    id: "10000000-0000-4000-8000-000000000007",
    pref: "宮城県",
    name: "丸森町",
    code: "04341",
    group: "coarse",
  },
  {
    id: "10000000-0000-4000-8000-000000000008",
    pref: "群馬県",
    name: "中之条町",
    code: "10421",
    group: "coarse",
  },
  {
    id: "10000000-0000-4000-8000-000000000009",
    pref: "福井県",
    name: "大野市",
    code: "18205",
    group: "coarse",
  },
  {
    id: "10000000-0000-4000-8000-000000000010",
    pref: "滋賀県",
    name: "高島市",
    code: "25212",
    group: "coarse",
  },
  {
    id: "10000000-0000-4000-8000-000000000011",
    pref: "岡山県",
    name: "高梁市",
    code: "33209",
    group: "coarse",
  },
  {
    id: "10000000-0000-4000-8000-000000000012",
    pref: "大分県",
    name: "竹田市",
    code: "44208",
    group: "coarse",
  },
];

// 間引きの強さ（元の頂点のうち残す割合）と座標の桁数。上限を超えたらここを調整する。
const GROUPS = {
  fine: { keep: "10%", precision: 0.00001, maxBytes: 25 * 1024 },
  coarse: { keep: "6%", precision: 0.0001, maxBytes: 10 * 1024 },
};
const TOTAL_MAX_BYTES = 200 * 1024;

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const seedPath = join(root, "supabase", "seed.sql");
const cacheDir = process.env.N03_CACHE_DIR ?? join(tmpdir(), "anaba-n03");
const checkOnly = process.argv.includes("--check");

const BEGIN =
  "-- BEGIN boundaries（scripts/boundaries/build.mjs が生成。手で編集しない）";
const END = "-- END boundaries";

async function download(prefCode) {
  const name = `N03-${N03_DATE}_${prefCode}_GML.zip`;
  const path = join(cacheDir, name);
  if (existsSync(path)) return path;
  // 配布元は国土数値情報ダウンロードサイト（国土交通省）だけ
  const url = `https://nlftp.mlit.go.jp/ksj/gml/data/N03/${N03_VERSION}/${name}`;
  console.log(`download ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

function readPrefecture(zipPath, prefCode) {
  const json = execFileSync(
    "unzip",
    ["-p", zipPath, `N03-${N03_DATE}_${prefCode}.geojson`],
    {
      maxBuffer: 1024 * 1024 * 1024,
    },
  );
  return JSON.parse(json.toString("utf8"));
}

function simplify(features, { keep, precision }) {
  const input = join(cacheDir, "input.geojson");
  const output = join(cacheDir, "output.geojson");
  writeFileSync(input, JSON.stringify({ type: "FeatureCollection", features }));
  // 同じ市町村の複数ポリゴン（飛び地・島）を dissolve でまとめてから、全地域をまとめて間引く。
  // まとめて間引くと隣り合う地域の共有の辺が同じ形になり、隙間や重なりが出ない。
  execFileSync(
    "npx",
    [
      "-y",
      MAPSHAPER,
      "-i",
      input,
      "-dissolve",
      "N03_007",
      "-simplify",
      "weighted",
      "keep-shapes",
      keep,
      "-clean",
      "-o",
      output,
      "format=geojson",
      `precision=${precision}`,
      "force",
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  return JSON.parse(readFileSync(output, "utf8")).features;
}

async function main() {
  mkdirSync(cacheDir, { recursive: true });

  const byCode = new Map();
  const prefCodes = [...new Set(AREAS.map((a) => a.code.slice(0, 2)))];
  for (const prefCode of prefCodes) {
    const collection = readPrefecture(await download(prefCode), prefCode);
    for (const f of collection.features) {
      const area = AREAS.find((a) => a.code === f.properties.N03_007);
      if (!area) continue;
      // コードの取り違え防止に、県名と市町村名も合っているか確かめる
      if (
        f.properties.N03_001 !== area.pref ||
        f.properties.N03_004 !== area.name
      ) {
        throw new Error(
          `${area.code} は ${f.properties.N03_001}${f.properties.N03_004}（${area.name} ではない）`,
        );
      }
      byCode.set(area.code, [...(byCode.get(area.code) ?? []), f]);
    }
  }

  const geometries = new Map();
  for (const [group, options] of Object.entries(GROUPS)) {
    const features = AREAS.filter((a) => a.group === group).flatMap((a) => {
      const found = byCode.get(a.code);
      if (!found)
        throw new Error(`${a.pref}${a.name}（${a.code}）が N03 に見つからない`);
      return found.map((f) => ({
        ...f,
        properties: { N03_007: f.properties.N03_007 },
      }));
    });
    for (const f of simplify(features, options)) {
      geometries.set(f.properties.N03_007, f.geometry);
    }
  }

  let total = 0;
  const lines = [];
  let over = false;
  for (const area of AREAS) {
    const geometry = geometries.get(area.code);
    if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type)) {
      throw new Error(`${area.name}: 境界が作れなかった`);
    }
    const json = JSON.stringify({
      type: geometry.type,
      coordinates: geometry.coordinates,
    });
    const bytes = Buffer.byteLength(json);
    const limit = GROUPS[area.group].maxBytes;
    total += bytes;
    over ||= bytes > limit;
    const points =
      JSON.stringify(geometry.coordinates).match(/\],\[/g)?.length ?? 0;
    console.log(
      `${area.name.padEnd(5, "　")} ${geometry.type.padEnd(12)} 頂点 約${String(points + 1).padStart(5)}  ${(bytes / 1024).toFixed(1).padStart(5)}KB / ${limit / 1024}KB${bytes > limit ? "  超過" : ""}`,
    );
    lines.push(`-- ${area.pref}${area.name}（N03_007 = ${area.code}）`);
    lines.push(`update public.areas set boundary = '${json}'::jsonb`);
    lines.push(`where id = '${area.id}';`);
  }
  console.log(
    `合計 ${(total / 1024).toFixed(1)}KB / ${TOTAL_MAX_BYTES / 1024}KB`,
  );
  if (over || total > TOTAL_MAX_BYTES)
    throw new Error("サイズの上限を超えた。GROUPS の keep を下げる");

  if (checkOnly) return;

  const block = [
    BEGIN,
    `-- 出典: 「国土数値情報（行政区域データ）」（国土交通省）${N03_VERSION}（令和7年1月1日時点）を加工して作成。CC BY 4.0。`,
    "-- 加工: 市町村ごとにまとめ、mapshaper で頂点を間引いた。形は GeoJSON の geometry（Polygon / MultiPolygon）、座標は [経度, 緯度]。",
    ...lines,
    END,
  ].join("\n");
  const seed = readFileSync(seedPath, "utf8");
  const start = seed.indexOf(BEGIN);
  const end = seed.indexOf(END);
  const next =
    start >= 0 && end > start
      ? seed.slice(0, start) + block + seed.slice(end + END.length)
      : `${seed.trimEnd()}\n\n${block}\n`;
  writeFileSync(seedPath, next);
  console.log(`更新: ${seedPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
