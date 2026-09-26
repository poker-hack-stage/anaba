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

北アルプス山麓の5地域のスポット（#30）の写真を #67 で用意した。Wikimedia Commons で、ライセンスが CC BY・CC BY-SA・CC0・パブリックドメインのものだけを使い、写っているのがそのスポットだと、写真の説明・撮影地・画像そのもので確かめた（2026-09-25）。Commons にないものは、Flickr で撮影者が CC BY を付けた写真を Openverse で探して使った（NC・ND は使わない。題名・タグ・位置情報でスポットを確かめた。2026-09-26）。長辺を1200px以下に縮小し、300KB 以下に圧縮して `public/images/spots/` に置いた（パスの番号は `spots.id` の末尾2桁と同じ）。

- 撮影者・ライセンス・元の写真の題名は、アプリの「写真の出典」ページ（`/credits`、フッターからリンク）に出す（CC BY・CC BY-SA は、題名が付いていればその表示も求める）。題名は、Flickr は写真のページの題名（2026-09-26 に4件とも確かめた）、Commons はファイルページの名前（`File:` を除き `_` を空白にしたもの）を書く。元のデータは `lib/photo-credits.ts`。写真を足すときは、ここと `lib/photo-credits.ts`・`supabase/seed.sql` の `image_path` を同じコミットで直す
- 見つからないスポットは `image_path` を `null` のまま（表示側はカテゴリのイラスト）にし、理由を下の表に書いた
- スポットの事実の出典は docs/spot-sources.md。全国のほかの地域のスポット（#58）は写真がなくてよい

| スポット                   | 地域     | 予定の `image_path`              | 出典（URL・撮影者）                                                                                                                                                                                     | ライセンス         | 状態     |
| -------------------------- | -------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------- |
| 白馬塩の道温泉 倉下の湯    | 白馬村   | `/images/spots/hakuba-01.jpg`    | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Kurashita_no_yu.jpg)・Qurren                                                                                                                | CC BY-SA 4.0       | 用意済み |
| 青鬼集落                   | 白馬村   | `/images/spots/hakuba-02.jpg`    | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:青鬼集落_-_panoramio.jpg)・くろふね                                                                                                         | CC BY 3.0          | 用意済み |
| 大出公園                   | 白馬村   | `/images/spots/hakuba-03.jpg`    | [Wikimedia Commons](<https://commons.wikimedia.org/wiki/File:大出吊橋_-_panoramio_(4).jpg>)・くろふね                                                                                                   | CC BY 3.0          | 用意済み |
| 姫川源流自然探勝園         | 白馬村   | `/images/spots/hakuba-04.jpg`    | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:姫川源流_-_panoramio.jpg)・くろふね                                                                                                         | CC BY 3.0          | 用意済み |
| 白馬ガラス工房GAKU         | 白馬村   | `/images/spots/hakuba-05.jpg`    | Commons・Openverse（Flickr など）で「白馬ガラス工房GAKU」「Hakuba glass」「とんぼ玉 白馬」、座標から600m以内の位置情報を探したが、工房の写真はない。お店の許可をもらって撮る                            |                    | なし     |
| 貞麟寺                     | 白馬村   | `/images/spots/hakuba-06.jpg`    | [Flickr](https://www.flickr.com/photos/154568645@N04/34658438162)・wakaba-shinshu（題名「桜@貞麟寺」・タグ「白馬」。境内の枝垂れ桜）                                                                    | CC BY 2.0          | 用意済み |
| おやきの山愛               | 白馬村   | `/images/spots/hakuba-07.jpg`    | Commons・Openverse で「おやきの山愛」「山愛」「おやき 白馬」、座標から600m以内を探したが、お店の写真はない                                                                                              |                    | なし     |
| Kitchen＆Marché 農かふぇ   | 白馬村   | `/images/spots/hakuba-08.jpg`    | Commons・Openverse で「農かふぇ」「Kitchen Marche Hakuba」、座標から600m以内を探したが、お店の写真はない                                                                                                |                    | なし     |
| 塩の道ちょうじや           | 大町市   | `/images/spots/omachi-01.jpg`    | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Hirabayashi-ke_Jyutaku_Shuoku.jpg)・Suikotei                                                                                                | CC BY 4.0          | 用意済み |
| 若一王子神社               | 大町市   | `/images/spots/omachi-02.jpg`    | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:若一王子神社鳥居と三重塔.jpg)・Furudanuki                                                                                                   | CC BY-SA 4.0       | 用意済み |
| ぽかぽかランド美麻         | 大町市   | `/images/spots/omachi-03.jpg`    | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Road_Station_Poka-Poka_Land_Miasa_01.jpg)・小石川人晃                                                                                       | CC BY-SA 4.0       | 用意済み |
| ゆいせきや                 | 大町市   | `/images/spots/omachi-04.jpg`    | Commons・Openverse で「ゆいせきや」「Yuisekiya」、座標から600m以内（信濃大町駅の周り）を探したが、お店の写真はない                                                                                      |                    | なし     |
| 創舎 わちがい              | 大町市   | `/images/spots/omachi-05.jpg`    | Commons・Openverse で「わちがい」「Wachigai Omachi」、座標から600m以内を探したが、お店の写真はない（「輪違屋」は京都の別の店）                                                                          |                    | なし     |
| 居谷里湿原                 | 大町市   | `/images/spots/omachi-06.jpg`    | [Flickr](https://www.flickr.com/photos/154568645@N04/34011672963)・wakaba-shinshu（題名「リュウキンカ@居谷里湿原」。湿原のリュウキンカ）                                                                | CC BY 2.0          | 用意済み |
| 中綱湖                     | 大町市   | `/images/spots/omachi-07.jpg`    | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:中綱湖_-_panoramio.jpg)・くろふね                                                                                                           | CC BY 3.0          | 用意済み |
| 鷹狩山                     | 大町市   | `/images/spots/omachi-08.jpg`    | [Flickr](https://www.flickr.com/photos/13217899@N08/3507257327)・wakanmuri（題名「Japan North Alps」。位置情報が山頂の展望台。大町の市街地と北アルプス）                                                | CC BY 2.0          | 用意済み |
| 池田八幡神社               | 池田町   | `/images/spots/ikeda-01.jpg`     | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:池田八幡神社社殿.jpg)・At1973                                                                                                               | CC BY-SA 4.0       | 用意済み |
| あづみ野池田クラフトパーク | 池田町   | `/images/spots/ikeda-02.jpg`     | Commons・Openverse で「クラフトパーク 池田」「Azumino Ikeda Craft Park」、座標から600m以内を探したが、園内の石碑（上原良司の碑）だけ                                                                    |                    | なし     |
| 北アルプス展望美術館       | 池田町   | `/images/spots/ikeda-03.jpg`     | Commons・Openverse で「北アルプス展望美術館」「池田町立美術館」「展望美術館」を探したが、美術館の写真はない                                                                                             |                    | なし     |
| 夢農場                     | 池田町   | `/images/spots/ikeda-04.jpg`     | [Flickr](https://www.flickr.com/photos/154568645@N04/34840653796)・wakaba-shinshu（題名「桜@池田町 夢農場」。桜と北アルプス）                                                                           | CC BY 2.0          | 用意済み |
| 花紋大雪渓                 | 池田町   | `/images/spots/ikeda-05.jpg`     | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Daisekkei_Sake_Brewing_1.jpg)・Qurren                                                                                                       | CC BY-SA 4.0       | 用意済み |
| カフェ風のいろ             | 池田町   | `/images/spots/ikeda-06.jpg`     | Commons・Openverse で「カフェ風のいろ」「Kazenoiro」を探したが、お店の写真はない                                                                                                                        |                    | なし     |
| HOP FROG CAFE              | 池田町   | `/images/spots/ikeda-07.jpg`     | Commons・Openverse で「HOP FROG CAFE」「Hop Frog Cafe Ikeda」を探したが、別のもの（ポーの小説の絵など）だけ                                                                                             |                    | なし     |
| 発酵と暮らし おはこ        | 池田町   | `/images/spots/ikeda-08.jpg`     | Commons・Openverse で「発酵と暮らし おはこ」「おはこ 池田」を探したが、お店の写真はない                                                                                                                 |                    | なし     |
| 豊科温泉 湯多里山の神      | 安曇野市 | `/images/spots/azumino-01.jpg`   | Commons・Openverse で「湯多里山の神」「湯多里」「Yutari」「豊科温泉」、座標から1.5km以内を探したが、施設の写真はない（「Yutari」は別の駅）                                                              |                    | なし     |
| ほりでーゆ〜四季の郷       | 安曇野市 | `/images/spots/azumino-02.jpg`   | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Holiday_You_Shikinosato.jpg)・Qurren                                                                                                        | CC BY-SA 3.0       | 用意済み |
| 安曇野市天蚕センター       | 安曇野市 | `/images/spots/azumino-03.jpg`   | Commons・Openverse で「天蚕センター」「Tensan Azumino」「天蚕」、座標から1.5km以内を探したが、施設の写真はない（「天蚕」は虫の写真だけ）                                                                |                    | なし     |
| 貞享義民記念館             | 安曇野市 | `/images/spots/azumino-04.jpg`   | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Kinenkan.JPG)・小松宏彰                                                                                                                     | パブリックドメイン | 用意済み |
| 長峰山                     | 安曇野市 | `/images/spots/azumino-05.jpg`   | Commons・Openverse で「長峰山」「Nagamine Azumino」、座標から1.5km以内を探した。Commons は麓の宿「長峰荘」の写真（展望台とは別の場所）、Flickr の「長峰山展望台の朝」は暗くて山の影しか写らない         |                    | なし     |
| 御宝田遊水池               | 安曇野市 | `/images/spots/azumino-06.jpg`   | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:御宝田遊水池.jpg)・アポロ2                                                                                                                  | CC BY-SA 4.0       | 用意済み |
| 烏川渓谷緑地               | 安曇野市 | `/images/spots/azumino-07.jpg`   | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Karasu_River_view_from_Karasugawakeikokubashi-bridge.jpg)・Qurren                                                                           | CC BY-SA 3.0       | 用意済み |
| 三郷サラダ市               | 安曇野市 | `/images/spots/azumino-08.jpg`   | Commons・Openverse で「三郷サラダ市」「サラダ市」「Misato Azumino」、座標から1.5km以内を探したが、直売所の写真はない（三郷支所など別の建物だけ）                                                        |                    | なし     |
| 松本市はかり資料館         | 松本市   | `/images/spots/matsumoto-01.jpg` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:250425_Matsumoto_City_Hakari_Museum_Matsumoto_Nagano_pref_Japan01s3.jpg)・663highland                                                       | CC BY-SA 4.0       | 用意済み |
| ホットプラザ浅間           | 松本市   | `/images/spots/matsumoto-02.jpg` | Commons・Openverse で「ホットプラザ浅間」「Hot Plaza Asama」「浅間温泉」を探した。近くの写真は別の施設（浅間温泉文化センター）と温泉街だけ                                                              |                    | なし     |
| 手仕事商會 すぐり          | 松本市   | `/images/spots/matsumoto-03.jpg` | Commons・Openverse で「すぐり 松本」「Suguri Matsumoto」、座標から600m以内（縄手通り・四柱神社の周り）を探したが、お店の写真はない                                                                      |                    | なし     |
| ファーマーズガーデンうちだ | 松本市   | `/images/spots/matsumoto-04.jpg` | Commons・Openverse で「ファーマーズガーデンうちだ」「Farmers Garden Uchida」、座標から600m以内を探したが、直売所の写真はない（内田地区の風景だけ）                                                      |                    | なし     |
| 源智の井戸                 | 松本市   | `/images/spots/matsumoto-05.jpg` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:源智の井戸.jpg)・深志                                                                                                                       | CC BY-SA 3.0       | 用意済み |
| 馬場家住宅                 | 松本市   | `/images/spots/matsumoto-06.jpg` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Babake_house_2010.jpg)・Wiiii                                                                                                               | CC BY-SA 3.0       | 用意済み |
| 弘法山古墳                 | 松本市   | `/images/spots/matsumoto-07.jpg` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Koboyama_Kofun_zenkei.JPG)・Saigen Jiro                                                                                                     | CC0                | 用意済み |
| 城山公園                   | 松本市   | `/images/spots/matsumoto-08.jpg` | Commons・Openverse で「城山公園 松本」「Joyama Matsumoto」、座標から1.5km以内を探した。Commons の「城山公園」は別の県の公園、Flickr の1枚は640px の加工写真（Instagram のフィルター）でカードに向かない |                    | なし     |
