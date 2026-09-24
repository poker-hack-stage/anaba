# 写真の出典一覧

アプリで使う写真の出典とライセンス。写真を足したら、同じコミットでこの表に行を足す。

- 置き場所: `public/images/`（地域は `public/images/areas/`、スポットは `public/images/spots/`。#30 の案と同じ方針）
- DB の `image_path` には `public/` からのパス（例: `/images/areas/hakuba.jpg`）を書く
- 使えるのは、自分たちで撮影したものか、ライセンスが明確なものだけ（docs/spec.md データ-1）。参考 PoC の写真は使わない
- 1枚あたり長辺 1200px・300KB 以下を目安にする

## 地域（areas、#11）

`supabase/seed.sql` の `image_path` に対応する。写真はまだない（権利を確かめた写真を用意できていない）。写真がない間は、表示側でプレースホルダーを出す。

| 地域     | 都道府県 | `image_path`                    | 出典（URL・撮影者） | ライセンス | 状態   |
| -------- | -------- | ------------------------------- | ------------------- | ---------- | ------ |
| 白馬村   | 長野県   | `/images/areas/hakuba.jpg`      |                     |            | 未用意 |
| 大町市   | 長野県   | `/images/areas/omachi.jpg`      |                     |            | 未用意 |
| 池田町   | 長野県   | `/images/areas/ikeda.jpg`       |                     |            | 未用意 |
| 安曇野市 | 長野県   | `/images/areas/azumino.jpg`     |                     |            | 未用意 |
| 松本市   | 長野県   | `/images/areas/matsumoto.jpg`   |                     |            | 未用意 |
| 東川町   | 北海道   | `/images/areas/higashikawa.jpg` |                     |            | 未用意 |
| 丸森町   | 宮城県   | `/images/areas/marumori.jpg`    |                     |            | 未用意 |
| 中之条町 | 群馬県   | `/images/areas/nakanojo.jpg`    |                     |            | 未用意 |
| 大野市   | 福井県   | `/images/areas/ono.jpg`         |                     |            | 未用意 |
| 高島市   | 滋賀県   | `/images/areas/takashima.jpg`   |                     |            | 未用意 |
| 高梁市   | 岡山県   | `/images/areas/takahashi.jpg`   |                     |            | 未用意 |
| 竹田市   | 大分県   | `/images/areas/taketa.jpg`      |                     |            | 未用意 |

## スポット（spots、#30・#58）

#30・#58 で足す。
