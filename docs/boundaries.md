# 地域の境界データ（areas.boundary）

`supabase/seed.sql` の末尾にある `update public.areas set boundary = …` の15件（1地域1件）は、`scripts/boundaries/build.mjs` が作る（#10）。手で編集しない。

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

### 元のデータについて（2026-09-25 に調べ、2026-09-27 に15地域で調べ直した）

OpenStreetMap の日本の市町村の境界の多くは、国土数値情報（行政区域データ、N03）から取り込まれている。15地域のうち10地域の relation に `source=KSJ2/N03` が付いている（白馬村・大町市・池田町・安曇野市・大野市・高島市・高梁市・竹田市・津和野町・三好市）。残りの5地域（松本市・東川町・丸森町・中之条町・遠野市）には出典の記録がない。

国土数値情報の行政区域データは、国土地理院の「数値地図（国土基本情報）」から作られ、配布ページに測量法に基づく承認の記載がある。このアプリでは国土数値情報を直接使わず、OpenStreetMap のデータを ODbL に従って使う（kosei の判断、#10）。

## 形

- `boundary` は GeoJSON の geometry（`{"type": "Polygon" | "MultiPolygon", "coordinates": …}`）。Feature ではない（名前などは `areas` の列にある）
- 座標は `[経度, 緯度]`（WGS84）。MapLibre にそのまま渡せる
- 今の15地域のうち、三好市だけが `MultiPolygon`（2つの部分）で、ほかは `Polygon`。読む側は `MultiPolygon` にも対応しておく
- 三好市の北東の小さい部分（約43km²）は、旧三野町の飛び地。東みよし町をはさんで、本体から約3km 離れている。OpenStreetMap の relation も2つの外周（outer）でできていて、実際の市の境界どおり（つなぎ方・間引きのまちがいではない。2026-09-27 に確かめた）

## 間引きの強さとサイズ

北アルプス山麓の5地域は細かめ、ほかの地域は粗めにしている（Issue #10 の目安）。

| 区分                | 頂点を残す割合 | 座標の桁         | 1地域の上限 |
| ------------------- | -------------- | ---------------- | ----------- |
| 北アルプス山麓（5） | 10%            | 小数5桁（約1m）  | 25KB        |
| ほかの地域（10）    | 6%             | 小数4桁（約10m） | 10KB        |
| 合計（15）          |                |                  | 200KB       |

2026-09-27 に15地域をまとめて作り直したときの結果（JSON の文字数。OpenStreetMap は2026年9月26日時点）:

| 地域     | サイズ | 地域     | サイズ |
| -------- | -----: | -------- | -----: |
| 白馬村   |  4.7KB | 東川町   |  3.6KB |
| 大町市   | 11.5KB | 丸森町   |  4.3KB |
| 池田町   |  2.8KB | 中之条町 |  5.6KB |
| 安曇野市 |  7.8KB | 大野市   |  7.1KB |
| 松本市   | 17.3KB | 高島市   |  4.7KB |
|          |        | 高梁市   |  7.0KB |
|          |        | 竹田市   |  5.7KB |
|          |        | 遠野市   |  7.0KB |
|          |        | 津和野町 |  4.9KB |
|          |        | 三好市   |  7.3KB |

合計 101.2KB。全ポリゴンが valid で、隣り合う北アルプス山麓の地域どうしの重なりは0（PostGIS の `ST_IsValid`・`ST_Intersection` で確かめた）。どのスポットも自分の地域の境界の中にある。

間引きは区分（`GROUPS`）ごとにまとめて行う。同じ区分の中では、隣り合う地域の共有の辺が同じ形になり、隙間や重なりは出ない。隣り合う地域はどれも同じ区分にある（北アルプス山麓の5地域）。ほかの地域どうしは隣り合っていない。

残す頂点の割合は区分の全体で決まるので、地域を1つ足すと、同じ区分のほかの地域の形も少し変わる。地域を足したら、`AREAS` の全地域でまとめて作り直し、同じ区分のほかの地域の行も一緒に入れ替える（#161 では3地域を別々のブランチで作ったため、seed.sql の境界が15地域でまとめて作った結果と合っていなかった）。

## 作り直す手順

地域を足したり、OpenStreetMap の最新の境界に替えたりするとき。

1. `scripts/boundaries/build.mjs` の `AREAS` に、`seed.sql` と同じ id・県名・市町村名・全国地方公共団体コード（5桁）と、OpenStreetMap の relation の id を足す。relation の id は <https://www.openstreetmap.org/> で市町村名を検索して確かめる（同じ名前の町がほかの県にもあるので、名前では探さない）
2. 実行する

   ```bash
   node scripts/boundaries/build.mjs --check     # サイズの確認だけ
   node scripts/boundaries/build.mjs             # seed.sql を書き換える
   node scripts/boundaries/build.mjs --refresh   # キャッシュを使わず、最新を取り直す
   ```

3. サイズの上限を超えたら、`GROUPS` の `keep` を下げる。地域を足したときや `keep` を変えたときは、同じ区分のほかの地域の行も変わるので、本番の DB には変わった地域の分をすべて UPDATE する
4. `npm run db:reset` で投入できることを確かめ、地図に重ねてずれがないかを見る

必要なもの: Node.js 22、ネットワーク（osmtogeojson と mapshaper は `npx` で取得する。package.json には入れていない）。取得したデータは OS の一時ディレクトリの `anaba-osm/` に置く（`OSM_CACHE_DIR` で変えられる）。リポジトリには入れない。Overpass API が混んでいて 429・504 を返したときは、少し待って3回まで取り直す。
