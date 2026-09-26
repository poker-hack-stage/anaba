// 地域（areas）の境界を OpenStreetMap の市町村の境界（relation）から作り、supabase/seed.sql に書く（#10）。
// 手順・出典・ライセンスは docs/boundaries.md。
//
//   node scripts/boundaries/build.mjs            # ダウンロード（キャッシュがなければ）→ 間引き → seed.sql を更新
//   node scripts/boundaries/build.mjs --check    # seed.sql を書き換えず、サイズの確認だけ
//   node scripts/boundaries/build.mjs --refresh  # キャッシュを使わず、OpenStreetMap の最新を取り直す
//
// 必要なもの: Node.js 22、ネットワーク（初回のみ。Overpass API からの取得と、npx で osmtogeojson・mapshaper を取得する）。
// ダウンロードしたファイルは OS の一時ディレクトリ（OSM_CACHE_DIR で変更可）に置き、リポジトリには入れない。

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
// Overpass API は User-Agent のない取得を断る（406）
const USER_AGENT =
  "anaba-boundaries/1.0 (+https://github.com/poker-hack-stage/anaba)";
const OSMTOGEOJSON = "osmtogeojson@3.0.0-beta.5";
const MAPSHAPER = "mapshaper@0.6.121";

// seed.sql の areas と同じ固定 id。code は全国地方公共団体コードの5桁、osm は OpenStreetMap の relation の id。
// relation は名前で探さず id で固定する（同じ名前の町がほかの県にもあるため）。取り違えないよう、取得後に name と ref（code ＋検査数字）も照合する。
// fine = 北アルプス山麓（細かめ、1地域 25KB 以下）、coarse = ほかの地域（粗め、1地域 10KB 以下）。
const AREAS = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    pref: "長野県",
    name: "白馬村",
    code: "20485",
    osm: 4759944,
    group: "fine",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    pref: "長野県",
    name: "大町市",
    code: "20212",
    osm: 4759380,
    group: "fine",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    pref: "長野県",
    name: "池田町",
    code: "20481",
    osm: 4759847,
    group: "fine",
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    pref: "長野県",
    name: "安曇野市",
    code: "20220",
    osm: 4756346,
    group: "fine",
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    pref: "長野県",
    name: "松本市",
    code: "20202",
    osm: 3648972,
    group: "fine",
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    pref: "北海道",
    name: "東川町",
    code: "01458",
    osm: 4061071,
    group: "coarse",
  },
  {
    id: "10000000-0000-4000-8000-000000000007",
    pref: "宮城県",
    name: "丸森町",
    code: "04341",
    osm: 4153612,
    group: "coarse",
  },
  {
    id: "10000000-0000-4000-8000-000000000008",
    pref: "群馬県",
    name: "中之条町",
    code: "10421",
    osm: 5321164,
    group: "coarse",
  },
  {
    id: "10000000-0000-4000-8000-000000000009",
    pref: "福井県",
    name: "大野市",
    code: "18205",
    osm: 4799821,
    group: "coarse",
  },
  {
    id: "10000000-0000-4000-8000-000000000010",
    pref: "滋賀県",
    name: "高島市",
    code: "25212",
    osm: 722201,
    group: "coarse",
  },
  {
    id: "10000000-0000-4000-8000-000000000011",
    pref: "岡山県",
    name: "高梁市",
    code: "33209",
    osm: 3934642,
    group: "coarse",
  },
  {
    id: "10000000-0000-4000-8000-000000000012",
    pref: "大分県",
    name: "竹田市",
    code: "44208",
    osm: 4004864,
    group: "coarse",
  },
  {
    id: "10000000-0000-4000-8000-000000000014",
    pref: "島根県",
    name: "津和野町",
    code: "32501",
    osm: 4088334,
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
const cacheDir = process.env.OSM_CACHE_DIR ?? join(tmpdir(), "anaba-osm");
const checkOnly = process.argv.includes("--check");
const refresh = process.argv.includes("--refresh");

const BEGIN =
  "-- BEGIN boundaries（scripts/boundaries/build.mjs が生成。手で編集しない）";
const END = "-- END boundaries";

async function download() {
  // AREAS の relation を変えたら取り直すよう、ファイル名に relation の id の一覧を入れる
  const ids = AREAS.map((a) => a.osm).sort((a, b) => a - b);
  const key = createHash("sha256")
    .update(ids.join(","))
    .digest("hex")
    .slice(0, 12);
  const path = join(cacheDir, `relations-${key}.osm.json`);
  if (existsSync(path) && !refresh) return path;
  // relation と、その輪郭をつくる way・node をまとめて取る
  const query = `[out:json][timeout:300];
rel(id:${AREAS.map((a) => a.osm).join(",")});
(._;>;);
out body qt;`;
  // Overpass API は混んでいると 429・504 を返すので、少し待って3回まで試す
  let res;
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`download ${OVERPASS_URL}（${attempt}回目）`);
    res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ data: query }),
    });
    if (res.ok || ![429, 502, 503, 504].includes(res.status)) break;
    await new Promise((r) => setTimeout(r, 30_000 * attempt));
  }
  if (!res.ok) throw new Error(`${OVERPASS_URL}: ${res.status}`);
  // 途中で止まっても壊れたファイルがキャッシュに残らないよう、書き終えてから名前を変える
  const part = `${path}.part`;
  writeFileSync(part, Buffer.from(await res.arrayBuffer()));
  renameSync(part, path);
  return path;
}

// OpenStreetMap のデータの時点（例: 2026年9月25日時点）
function osmDateLabel(osmPath) {
  const base = JSON.parse(readFileSync(osmPath, "utf8")).osm3s
    ?.timestamp_osm_base;
  if (!base)
    throw new Error("Overpass API の応答に時点（timestamp_osm_base）がない");
  const d = new Date(base);
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日時点`;
}

// relation の way をつないで輪郭（Polygon / MultiPolygon）にする
function toFeatures(osmPath) {
  const json = execFileSync("npx", ["-y", OSMTOGEOJSON, osmPath], {
    maxBuffer: 1024 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
  return JSON.parse(json.toString("utf8")).features.filter((f) =>
    f.id?.startsWith("relation/"),
  );
}

function simplify(features, { keep, precision }) {
  const input = join(cacheDir, "input.geojson");
  const output = join(cacheDir, "output.geojson");
  writeFileSync(input, JSON.stringify({ type: "FeatureCollection", features }));
  // 全地域をまとめて間引く。まとめて間引くと隣り合う地域の共有の辺が同じ形になり、隙間や重なりが出ない。
  execFileSync(
    "npx",
    [
      "-y",
      MAPSHAPER,
      "-i",
      input,
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

  const osmPath = await download();
  const dateLabel = osmDateLabel(osmPath);

  const byCode = new Map();
  for (const f of toFeatures(osmPath)) {
    const area = AREAS.find((a) => `relation/${a.osm}` === f.id);
    if (!area) continue;
    // id の取り違え防止に、名前と ref（全国地方公共団体コード6桁 = code ＋検査数字）も合っているか確かめる
    const { name, ref } = f.properties;
    if (name !== area.name || !ref?.startsWith(area.code) || ref.length !== 6) {
      throw new Error(
        `relation ${area.osm} は ${name}（ref ${ref}）で、${area.name}（${area.code}）ではない`,
      );
    }
    byCode.set(area.code, {
      type: "Feature",
      properties: { code: area.code },
      geometry: f.geometry,
    });
  }

  const geometries = new Map();
  for (const [group, options] of Object.entries(GROUPS)) {
    const features = AREAS.filter((a) => a.group === group).map((a) => {
      const found = byCode.get(a.code);
      if (!found)
        throw new Error(
          `${a.pref}${a.name}（relation ${a.osm}）が OpenStreetMap に見つからない`,
        );
      return found;
    });
    for (const f of simplify(features, options)) {
      geometries.set(f.properties.code, f.geometry);
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
    lines.push(
      `-- ${area.pref}${area.name}（OpenStreetMap relation ${area.osm}）`,
    );
    lines.push(`update public.areas set boundary = '${json}'::jsonb`);
    lines.push(`where id = '${area.id}';`);
  }
  console.log(
    `合計 ${(total / 1024).toFixed(1)}KB / ${TOTAL_MAX_BYTES / 1024}KB`,
  );
  if (over || total > TOTAL_MAX_BYTES)
    throw new Error("サイズの上限を超えた。GROUPS の keep を下げる");

  if (checkOnly) return;

  const seed = readFileSync(seedPath, "utf8");
  // id の打ち間違いは update が0行になるだけで気づけないので、insert 文にあるかを先に確かめる
  for (const area of AREAS) {
    if (!seed.includes(`'${area.id}', '${area.name}'`)) {
      throw new Error(
        `${area.name}（${area.id}）が seed.sql の areas の insert に見つからない`,
      );
    }
  }

  const block = [
    BEGIN,
    `-- 出典: © OpenStreetMap contributors（${dateLabel}）。Open Database License（ODbL）。https://www.openstreetmap.org/copyright`,
    "-- 加工: 市町村の境界（relation）を mapshaper で間引いた。形は GeoJSON の geometry（Polygon / MultiPolygon）、座標は [経度, 緯度]。",
    "-- この境界のデータは ODbL のもとで公開する（docs/boundaries.md）。",
    ...lines,
    END,
  ].join("\n");
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
