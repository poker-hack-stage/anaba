# 写真の出典一覧

アプリで使う写真の出典とライセンス。写真を足したら、同じコミットでこの表に行を足す。

- 置き場所: `public/images/`（地域は `public/images/areas/`、スポットは `public/images/spots/`。#30 の案と同じ方針）
- DB の `image_path` には `public/` からのパス（例: `/images/areas/hakuba.jpg`）を書く。写真がない間は `null`（表示側でプレースホルダーを出す）
- 使えるのは、自分たちで撮影したものか、ライセンスが明確なものだけ（docs/spec.md データ-1）。参考 PoC の写真は使わない
- 1枚あたり長辺 1200px・300KB 以下を目安にする

## 地域（areas、#11）

写真はまだない（権利を確かめた写真を用意できていない）。`supabase/seed.sql` の `image_path` は全地域 `null` で、表示側はプレースホルダーを出す。北アルプス山麓の5地域の写真は #65 で用意し、写真を置いたら `image_path` に下の表の予定のパスを入れる。全国のほかの地域は写真がなくてよい（docs/spec.md データ-1）。

| 地域     | 都道府県 | 予定の `image_path`             | 出典（URL・撮影者） | ライセンス | 状態   |
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

写真はまだない。北アルプス山麓の5地域のスポット（#30）は `supabase/seed.sql` の `image_path` が全件 `null` で、表示側はプレースホルダーを出す。写真は #67 で用意し、置いたら `image_path` に下の表の予定のパスを入れる（パスの番号は `spots.id` の末尾2桁と同じ）。スポットの事実の出典は docs/spot-sources.md。全国のほかの地域のスポット（#58）は写真がなくてよい。

| スポット                   | 地域     | 予定の `image_path`              | 出典（URL・撮影者） | ライセンス | 状態   |
| -------------------------- | -------- | -------------------------------- | ------------------- | ---------- | ------ |
| 白馬塩の道温泉 倉下の湯    | 白馬村   | `/images/spots/hakuba-01.jpg`    |                     |            | 未用意 |
| 青鬼集落                   | 白馬村   | `/images/spots/hakuba-02.jpg`    |                     |            | 未用意 |
| 大出公園                   | 白馬村   | `/images/spots/hakuba-03.jpg`    |                     |            | 未用意 |
| 姫川源流自然探勝園         | 白馬村   | `/images/spots/hakuba-04.jpg`    |                     |            | 未用意 |
| 白馬ガラス工房GAKU         | 白馬村   | `/images/spots/hakuba-05.jpg`    |                     |            | 未用意 |
| 貞麟寺                     | 白馬村   | `/images/spots/hakuba-06.jpg`    |                     |            | 未用意 |
| おやきの山愛               | 白馬村   | `/images/spots/hakuba-07.jpg`    |                     |            | 未用意 |
| Kitchen＆Marché 農かふぇ   | 白馬村   | `/images/spots/hakuba-08.jpg`    |                     |            | 未用意 |
| 塩の道ちょうじや           | 大町市   | `/images/spots/omachi-01.jpg`    |                     |            | 未用意 |
| 若一王子神社               | 大町市   | `/images/spots/omachi-02.jpg`    |                     |            | 未用意 |
| ぽかぽかランド美麻         | 大町市   | `/images/spots/omachi-03.jpg`    |                     |            | 未用意 |
| ゆいせきや                 | 大町市   | `/images/spots/omachi-04.jpg`    |                     |            | 未用意 |
| 創舎 わちがい              | 大町市   | `/images/spots/omachi-05.jpg`    |                     |            | 未用意 |
| 居谷里湿原                 | 大町市   | `/images/spots/omachi-06.jpg`    |                     |            | 未用意 |
| 中綱湖                     | 大町市   | `/images/spots/omachi-07.jpg`    |                     |            | 未用意 |
| 鷹狩山                     | 大町市   | `/images/spots/omachi-08.jpg`    |                     |            | 未用意 |
| 池田八幡神社               | 池田町   | `/images/spots/ikeda-01.jpg`     |                     |            | 未用意 |
| あづみ野池田クラフトパーク | 池田町   | `/images/spots/ikeda-02.jpg`     |                     |            | 未用意 |
| 北アルプス展望美術館       | 池田町   | `/images/spots/ikeda-03.jpg`     |                     |            | 未用意 |
| 夢農場                     | 池田町   | `/images/spots/ikeda-04.jpg`     |                     |            | 未用意 |
| 花紋大雪渓                 | 池田町   | `/images/spots/ikeda-05.jpg`     |                     |            | 未用意 |
| カフェ風のいろ             | 池田町   | `/images/spots/ikeda-06.jpg`     |                     |            | 未用意 |
| HOP FROG CAFE              | 池田町   | `/images/spots/ikeda-07.jpg`     |                     |            | 未用意 |
| 発酵と暮らし おはこ        | 池田町   | `/images/spots/ikeda-08.jpg`     |                     |            | 未用意 |
| 豊科温泉 湯多里山の神      | 安曇野市 | `/images/spots/azumino-01.jpg`   |                     |            | 未用意 |
| ほりでーゆ〜四季の郷       | 安曇野市 | `/images/spots/azumino-02.jpg`   |                     |            | 未用意 |
| 安曇野市天蚕センター       | 安曇野市 | `/images/spots/azumino-03.jpg`   |                     |            | 未用意 |
| 貞享義民記念館             | 安曇野市 | `/images/spots/azumino-04.jpg`   |                     |            | 未用意 |
| 長峰山                     | 安曇野市 | `/images/spots/azumino-05.jpg`   |                     |            | 未用意 |
| 御宝田遊水池               | 安曇野市 | `/images/spots/azumino-06.jpg`   |                     |            | 未用意 |
| 烏川渓谷緑地               | 安曇野市 | `/images/spots/azumino-07.jpg`   |                     |            | 未用意 |
| 三郷サラダ市               | 安曇野市 | `/images/spots/azumino-08.jpg`   |                     |            | 未用意 |
| 松本市はかり資料館         | 松本市   | `/images/spots/matsumoto-01.jpg` |                     |            | 未用意 |
| ホットプラザ浅間           | 松本市   | `/images/spots/matsumoto-02.jpg` |                     |            | 未用意 |
| 手仕事商會 すぐり          | 松本市   | `/images/spots/matsumoto-03.jpg` |                     |            | 未用意 |
| ファーマーズガーデンうちだ | 松本市   | `/images/spots/matsumoto-04.jpg` |                     |            | 未用意 |
| 源智の井戸                 | 松本市   | `/images/spots/matsumoto-05.jpg` |                     |            | 未用意 |
| 馬場家住宅                 | 松本市   | `/images/spots/matsumoto-06.jpg` |                     |            | 未用意 |
| 弘法山古墳                 | 松本市   | `/images/spots/matsumoto-07.jpg` |                     |            | 未用意 |
| 城山公園                   | 松本市   | `/images/spots/matsumoto-08.jpg` |                     |            | 未用意 |
