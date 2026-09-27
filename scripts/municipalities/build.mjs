// 「穴場を教える」で市区町村を入力するときの候補と、地図を移動する範囲を作り、lib/geo/municipalities.json に書く。
// 元のデータは Geolonia 住所データ（https://github.com/geolonia/japanese-addresses 、CC BY 4.0）。
// 町丁目ごとの代表点（緯度・経度）から、市区町村ごとの範囲（外枠）を求める。出典・ライセンスは docs/municipalities.md。
//
//   git clone --depth 1 https://github.com/geolonia/japanese-addresses.git /tmp/japanese-addresses
//   node scripts/municipalities/build.mjs /tmp/japanese-addresses
//
// 名前のそろえ方
//   - 政令指定都市の区（札幌市中央区など）は、市（札幌市）にまとめる
//   - 郡の名前（北安曇郡白馬村）は外す（白馬村）。同じ県に同じ名前が残るときだけ郡を付けたままにする

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = process.argv[2];
if (!source) {
  console.error(
    "使い方: node scripts/municipalities/build.mjs <japanese-addresses のディレクトリ>",
  );
  process.exit(1);
}

/** 町丁目が1つだけなど、範囲が点になるときに広げる幅（度。約2km） */
const MIN_HALF_SPAN = 0.02;
/** 端の町丁目の外れ値（離島など）に引っぱられないよう、両端のこの割合を外して範囲を取る */
const TRIM = 0.02;

const list = JSON.parse(readFileSync(join(source, "api", "ja.json"), "utf8"));

const output = {};
let count = 0;
for (const [prefecture, cities] of Object.entries(list)) {
  const merged = new Map();
  for (const city of cities) {
    const ward = /^(.+?市)(.+区)$/.exec(city);
    const name = ward ? ward[1] : city;
    const file = join(source, "api", "ja", prefecture, `${city}.json`);
    const towns = JSON.parse(readFileSync(file, "utf8"));
    const points = towns
      .filter((t) => Number.isFinite(t.lat) && Number.isFinite(t.lng))
      .map((t) => [t.lng, t.lat]);
    const entry = merged.get(name) ?? { full: name, points: [] };
    entry.points.push(...points);
    merged.set(name, entry);
  }

  const names = [...merged.keys()].map((full) => ({
    full,
    short: full.replace(/^.+?郡(.+[町村])$/, "$1"),
  }));
  const shortCount = new Map();
  for (const { short } of names) {
    shortCount.set(short, (shortCount.get(short) ?? 0) + 1);
  }

  output[prefecture] = [];
  for (const { full, short } of names) {
    const { points } = merged.get(full);
    if (points.length === 0) continue;
    const name = shortCount.get(short) > 1 ? full : short;
    output[prefecture].push([name, ...bbox(points)]);
    count++;
  }
}

function bbox(points) {
  const lngs = points.map((p) => p[0]).sort((a, b) => a - b);
  const lats = points.map((p) => p[1]).sort((a, b) => a - b);
  const [west, east] = trimmedRange(lngs);
  const [south, north] = trimmedRange(lats);
  return [...widen(west, east), ...widen(south, north)].map(
    (v) => Math.round(v * 1000) / 1000,
  );
}

function trimmedRange(sorted) {
  const cut = sorted.length >= 50 ? Math.floor(sorted.length * TRIM) : 0;
  return [sorted[cut], sorted[sorted.length - 1 - cut]];
}

function widen(min, max) {
  const mid = (min + max) / 2;
  const half = Math.max((max - min) / 2, MIN_HALF_SPAN);
  return [mid - half, mid + half];
}

// 並びを [名前, 西, 東, 南, 北] から [名前, 西, 南, 東, 北] にする
for (const cities of Object.values(output)) {
  for (const c of cities) {
    const [name, w, e, s, n] = c;
    c.splice(0, 5, name, w, s, e, n);
  }
}

const json = `${JSON.stringify(output)}\n`;
writeFileSync(join(root, "lib", "geo", "municipalities.json"), json);
console.log(
  `${Object.keys(output).length} 都道府県・${count} 市区町村、${(json.length / 1024).toFixed(0)} KB`,
);
