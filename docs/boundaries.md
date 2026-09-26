# 地域の境界データ（areas.boundary）

`supabase/seed.sql` の末尾にある `update public.areas set boundary = …` の12行は、`scripts/boundaries/build.mjs` が作る（#10）。手で編集しない。

## 出典とライセンス

| 項目       | 内容                                                                                                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| データ     | OpenStreetMap の市町村の境界（`boundary=administrative`・`admin_level=7` の relation）。Overpass API（<https://overpass-api.de/>）で取得                                                             |
| 著作権     | © OpenStreetMap contributors（<https://www.openstreetmap.org/copyright>）                                                                                                                            |
| ライセンス | Open Database License（ODbL 1.0）                                                                                                                                                                    |
| 加工       | relation の way をつないで輪郭にし（osmtogeojson）、mapshaper で頂点を間引き、座標の桁を丸めた                                                                                                       |
| 表示       | 地図や画面に出すときは「© OpenStreetMap contributors」を出す。地図の帰属表示（`components/map/spot-map.tsx`）に足している（#14）。背景の地図（OpenFreeMap）の帰属表示にも OpenStreetMap が入っている |

### ODbL で守ること

- **帰属表示**: 境界を見せる画面では「© OpenStreetMap contributors」が見えるようにする
- **同じライセンスで公開する（share-alike）**: 加工した境界のデータ（`seed.sql` の該当の行）は ODbL のもとで公開する。このリポジトリは public なので、`seed.sql` とこの文書で満たしている。ほかのデータ（スポットなど）と同じ DB に入れるだけなら、ほかのデータまで ODbL にはならない
- 手を加えた境界を OpenStreetMap 以外の出典と混ぜない

### 元のデータについて（2026-09-25 に調べた）

OpenStreetMap の日本の市町村の境界の多くは、国土数値情報（行政区域データ、N03）から取り込まれている。12地域のうち8地域の relation に `source=KSJ2/N03` が付いている（白馬村・大町市・池田町・安曇野市・大野市・高島市・高梁市・竹田市）。残りの4地域（松本市・東川町・丸森町・中之条町）には出典の記録がない。

国土数値情報の行政区域データは、国土地理院の「数値地図（国土基本情報）」から作られ、配布ページに測量法に基づく承認の記載がある。このアプリでは国土数値情報を直接使わず、OpenStreetMap のデータを ODbL に従って使う（kosei の判断、#10）。

## 形

- `boundary` は GeoJSON の geometry（`{"type": "Polygon" | "MultiPolygon", "coordinates": …}`）。Feature ではない（名前などは `areas` の列にある）
- 座標は `[経度, 緯度]`（WGS84）。MapLibre にそのまま渡せる
- 今の12地域はどれも `Polygon`（飛び地なし）だが、読む側は `MultiPolygon` にも対応しておく

## 間引きの強さとサイズ

北アルプス山麓の5地域は細かめ、ほかの地域は粗めにしている（Issue #10 の目安）。

| 区分                | 頂点を残す割合 | 座標の桁         | 1地域の上限 |
| ------------------- | -------------- | ---------------- | ----------- |
| 北アルプス山麓（5） | 10%            | 小数5桁（約1m）  | 25KB        |
| ほかの地域（7）     | 6%             | 小数4桁（約10m） | 10KB        |
| 合計（12）          |                |                  | 200KB       |

2026-09-25 に作ったときの結果（JSON の文字数）:

| 地域     | サイズ | 地域     | サイズ |
| -------- | -----: | -------- | -----: |
| 白馬村   |  4.7KB | 東川町   |  3.7KB |
| 大町市   | 11.5KB | 丸森町   |  4.5KB |
| 池田町   |  2.8KB | 中之条町 |  5.8KB |
| 安曇野市 |  7.8KB | 大野市   |  7.4KB |
| 松本市   | 17.3KB | 高島市   |  4.9KB |
|          |        | 高梁市   |  7.3KB |
|          |        | 竹田市   |  6.0KB |

合計 83.7KB。全ポリゴンが valid で、隣り合う北アルプス山麓の地域どうしの重なりは0。まとめて間引くので、共有の辺が同じ形になり、隙間や重なりは出ない。

## 作り直す手順

地域を足したり、OpenStreetMap の最新の境界に替えたりするとき。

1. `scripts/boundaries/build.mjs` の `AREAS` に、`seed.sql` と同じ id・県名・市町村名・全国地方公共団体コード（5桁）と、OpenStreetMap の relation の id を足す。relation の id は <https://www.openstreetmap.org/> で市町村名を検索して確かめる（同じ名前の町がほかの県にもあるので、名前では探さない）
2. 実行する

   ```bash
   node scripts/boundaries/build.mjs --check     # サイズの確認だけ
   node scripts/boundaries/build.mjs             # seed.sql を書き換える
   node scripts/boundaries/build.mjs --refresh   # キャッシュを使わず、最新を取り直す
   ```

3. サイズの上限を超えたら、`GROUPS` の `keep` を下げる
4. `npm run db:reset` で投入できることを確かめ、地図に重ねてずれがないかを見る

必要なもの: Node.js 22、ネットワーク（osmtogeojson と mapshaper は `npx` で取得する。package.json には入れていない）。取得したデータは OS の一時ディレクトリの `anaba-osm/` に置く（`OSM_CACHE_DIR` で変えられる）。リポジトリには入れない。Overpass API が混んでいて 429・504 を返したときは、少し待って3回まで取り直す。
