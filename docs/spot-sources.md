# スポットの出典（北アルプス山麓）

`supabase/seed.sql` の北アルプス山麓5地域のスポット（#30）について、書いた事実をどこで確かめたかを1件ずつ残す。スポットを直すときは、同じコミットでこの表も直す。

## 書き方の約束

- 実在し、一般に公開・営業している場所だけを載せる。私有地・立入禁止・危険な場所（上級の登山ルートなど）・休業中の場所は載せない
- 名前・営業時期・時間・料金・行き方などの事実は、公式サイト・自治体・観光協会・運営団体のページで確かめた（2026-09-25 時点）。まとめサイトや個人のブログは出典にしない
- 確かめられなかったことは書かない（推測で埋めない）。営業時間や料金は変わるので、`description` にはなるべく入れず、入れるときは出典に載る値をそのまま使う
- `rating` と穴場度は、docs/spot-scores.md（#61）の基準で手で付けた値。事実ではなく判断なので、根拠を下の表に書く
- `image_path` は写真を用意するまで全件 `null`（#65）。予定のパスは docs/image-credits.md

## 緯度経度の取り方

次の順で取り、スポットごとに「座標の取り方」の列に書いた。どれも公式の住所・所在地と食い違わないことを確かめている。

1. 公式ページに座標が載っていれば、その値
2. 公式の住所を[国土地理院のジオコーダー](https://msearch.gsi.go.jp/address-search/AddressSearch?q=)で引き、番地まで当たった値
3. 番地がない・番地まで当たらない場所は、OpenStreetMap の施設の位置（名前と、公式の住所・地図の範囲が合うものだけ）
4. それもない場所は、公式ページの埋め込み地図の中心（目安。数十〜数百 m ずれることがある）

地図のピンの位置として使う精度（おおむね100m 以内）を目安にしている。道案内には使わない。

全スポットの座標が、登録した地域（市町村）の行政区域の中にあることを、国土数値情報の行政区域データ（N03、2025年1月1日時点の長野県）で確かめた（2026-09-25）。

## 一覧（穴場度・評価と根拠）

穴場度（`hidden_gem_score`）の列は #61 で足すので、この PR の seed には入れていない。#61 のマージ後に `supabase/pending/hidden_gem_scores.sql` を流す（または seed の insert に移す）。

| id（末尾） | 地域     | スポット                   | カテゴリ | 評価 | 穴場度 | 穴場度の根拠                                                                                        |
| ---------- | -------- | -------------------------- | -------- | ---- | ------ | --------------------------------------------------------------------------------------------------- |
| `0101`     | 白馬村   | 白馬塩の道温泉 倉下の湯    | onsen    | 4.0  | 3      | 村の観光サイトの温泉一覧に載るが、全国的な知名度は低い。近隣4市町村の住民割引があり地元の利用が多い |
| `0102`     | 白馬村   | 青鬼集落                   | history  | 4.5  | 3      | 国の重伝建・棚田百選で県内では知られるが、山奥で観光客は少ない                                      |
| `0103`     | 白馬村   | 大出公園                   | view     | 4.5  | 2      | 村を代表する撮影地として紹介され、休日は写真を撮る人が多い                                          |
| `0104`     | 白馬村   | 姫川源流自然探勝園         | nature   | 4.0  | 3      | 名水百選だが全国的な観光地ではなく、村の観光情報に載る程度                                          |
| `0105`     | 白馬村   | 白馬ガラス工房GAKU         | craft    | 4.0  | 4      | 村の観光サイトに載る小さな工房で、村外の人にはほぼ知られていない                                    |
| `0106`     | 白馬村   | 貞麟寺                     | history  | 4.0  | 4      | 村の桜の名所として紹介される程度で、村外の人はほぼ知らない                                          |
| `0107`     | 白馬村   | おやきの山愛               | gourmet  | 4.0  | 4      | 個人の店で、村の観光サイトに載る程度                                                                |
| `0108`     | 白馬村   | Kitchen＆Marché 農かふぇ   | gourmet  | 4.0  | 4      | 村の観光サイトに載るが、村外の人はほぼ知らない                                                      |
| `0201`     | 大町市   | 塩の道ちょうじや           | history  | 4.0  | 4      | 市の観光協会に載る資料館で、市外の人はあまり知らない                                                |
| `0202`     | 大町市   | 若一王子神社               | history  | 4.0  | 3      | 流鏑馬は県内で知られるが、全国的な観光地ではない                                                    |
| `0203`     | 大町市   | ぽかぽかランド美麻         | onsen    | 3.5  | 4      | 市の観光協会に載る道の駅の温泉で、市外からの観光客は少ない                                          |
| `0204`     | 大町市   | ゆいせきや                 | craft    | 4.0  | 5      | 観光協会に載る小さな店で、旅行サイトにはほとんど出てこない                                          |
| `0205`     | 大町市   | 創舎 わちがい              | gourmet  | 4.0  | 3      | 市の観光協会の体験プランにも登場し、地域の観光情報に載る                                            |
| `0206`     | 大町市   | 居谷里湿原                 | nature   | 4.0  | 4      | 県の天然記念物だが観光協会に載る程度で、訪れるのは地元の人が中心                                    |
| `0207`     | 大町市   | 中綱湖                     | nature   | 4.0  | 3      | 観光協会が「穴場のフォトスポット」と紹介。桜の時期だけ混む                                          |
| `0208`     | 大町市   | 鷹狩山                     | view     | 4.5  | 3      | 地域の観光情報に載る展望地。休日も混むほどではない                                                  |
| `0301`     | 池田町   | 池田八幡神社               | history  | 3.5  | 5      | 地元の氏神で、観光客はほとんど見かけない                                                            |
| `0302`     | 池田町   | あづみ野池田クラフトパーク | view     | 4.0  | 3      | 県の「信州ふるさとの見える丘」に選ばれているが、全国的には知られていない                            |
| `0303`     | 池田町   | 北アルプス展望美術館       | view     | 4.0  | 3      | 県内の美術館案内に載るが、全国的な知名度は低い                                                      |
| `0304`     | 池田町   | 夢農場                     | nature   | 4.0  | 3      | 県の観光サイトと町の観光協会に載り、花の時期は人が集まる                                            |
| `0305`     | 池田町   | 花紋大雪渓                 | gourmet  | 4.0  | 3      | 「大雪渓」は県内で知られる地酒。直営店は地域の観光情報に載る程度                                    |
| `0306`     | 池田町   | カフェ風のいろ             | gourmet  | 4.0  | 4      | 町の観光協会のお食事ページに載る程度                                                                |
| `0307`     | 池田町   | HOP FROG CAFE              | gourmet  | 4.0  | 5      | 2025年に移ってきた新しい店で、旅行サイトにはほとんど出てこない                                      |
| `0308`     | 池田町   | 発酵と暮らし おはこ        | gourmet  | 4.0  | 5      | 2025年12月に観光協会に載った新しい小さな店                                                          |
| `0401`     | 安曇野市 | 豊科温泉 湯多里山の神      | onsen    | 4.0  | 4      | 田沢地区の公共の温泉で、観光協会の温泉一覧に載る程度                                                |
| `0402`     | 安曇野市 | ほりでーゆ〜四季の郷       | onsen    | 4.0  | 3      | 市の観光課・観光協会に載る温泉宿。地域の観光情報に載る程度                                          |
| `0403`     | 安曇野市 | 安曇野市天蚕センター       | craft    | 4.0  | 4      | 市と観光協会に載るが、市外の人はほぼ知らない                                                        |
| `0404`     | 安曇野市 | 貞享義民記念館             | history  | 3.5  | 5      | 全国的な知名度は低く、観光客はほとんど見かけない                                                    |
| `0405`     | 安曇野市 | 長峰山                     | view     | 4.5  | 3      | 県の観光サイトに載る地元の定番の展望地で、休日も混むほどではない                                    |
| `0406`     | 安曇野市 | 御宝田遊水池               | nature   | 4.0  | 3      | 白鳥の越冬地として県内で知られるが、全国的な観光地ではない                                          |
| `0407`     | 安曇野市 | 烏川渓谷緑地               | nature   | 4.0  | 4      | 県営公園だが全国的な知名度は低く、地元の人の散歩道                                                  |
| `0408`     | 安曇野市 | 三郷サラダ市               | gourmet  | 4.0  | 4      | 市の直売所案内に載る程度で、地元の人の買い物先                                                      |
| `0501`     | 松本市   | 松本市はかり資料館         | history  | 4.0  | 4      | 中町通りにあるが見過ごされやすい小さな資料館で、市外の人はあまり知らない                            |
| `0502`     | 松本市   | ホットプラザ浅間           | onsen    | 4.0  | 4      | 浅間温泉は県内で知られるが、市営の日帰り湯は地元の人が中心                                          |
| `0503`     | 松本市   | 手仕事商會 すぐり          | craft    | 4.5  | 4      | 市の観光サイトの体験に載るが、路地の奥で市外の人はあまり知らない                                    |
| `0504`     | 松本市   | ファーマーズガーデンうちだ | gourmet  | 4.0  | 4      | 地元の人の買い物先で、観光客は少ない                                                                |
| `0505`     | 松本市   | 源智の井戸                 | nature   | 4.0  | 2      | 名水百選の代表的な井戸で、市中心部の水めぐりの定番                                                  |
| `0506`     | 松本市   | 馬場家住宅                 | history  | 4.0  | 4      | 市立博物館の分館で、訪れる人は少ない                                                                |
| `0507`     | 松本市   | 弘法山古墳                 | view     | 4.5  | 2      | 桜の名所として県内で知られ、花の時期は交通規制が出るほど混む                                        |
| `0508`     | 松本市   | 城山公園                   | view     | 4.0  | 4      | 市民の公園で、観光客は少ない                                                                        |

評価は、公式の情報から分かる見どころ・設備・行きやすさをもとにした「近くに来たら寄りたい（4.0）」を基準に、眺めや体験がとくに良いものを 4.5、見どころが小さい・開いている日が限られるものを 3.5 にした。

## スポットごとの出典

### 白馬村

#### 白馬塩の道温泉 倉下の湯（`20000000-0000-4000-8000-000000000101`）

- 座標の取り方: OpenStreetMap の施設の位置（公式の住所・地図と照合）。住所は北城9549-8
- <https://www.kurashitanoyu.com/>: 由来・泉質・露天風呂・季節の営業時間の告知
- <https://www.kurashitanoyu.com/hours_price.html>: 年中無休・住民割引
- <https://www.kurashitanoyu.com/access.html>: 行き方・駐車場30台
- <https://www.vill.hakuba.nagano.jp/spots/kurashitanoyu/>: 住所・源泉かけ流し

#### 青鬼集落（`20000000-0000-4000-8000-000000000102`）

- 座標の取り方: OpenStreetMap の施設の位置（公式の住所・地図と照合）（保存地区の案内板）
- <https://www.vill.hakuba.lg.jp/gyosei/soshikikarasagasu/shogaigakushusportska/hakubamurakominkan/3/bunkazai/7989.html>: 重伝建の選定・主屋14棟・棚田百選
- <https://www.vill.hakuba.lg.jp/gyosei/soshikikarasagasu/shogaigakushusportska/hakubamurakominkan/3/aoni/aoni.html>: 標高・棚田約200枚・青鬼上堰・祭り
- <https://www.vill.hakuba.lg.jp/gyosei/soshikikarasagasu/shogaigakushusportska/hakubamurakominkan/3/aoni/10383.html>: 指定駐車場・見学のお願い・トイレ

#### 大出公園（`20000000-0000-4000-8000-000000000103`）

- 座標の取り方: 公式ページの埋め込み地図の中心（白馬村公式観光サイト）
- <https://www.vill.hakuba.nagano.jp/spots/ooide-park/>: 見どころ・古民家・見頃
- <https://www.vill.hakuba.lg.jp/gyosei/soshikikarasagasu/kensetsuka/4/1/1553.html>: 所在地・駐車場・施設・冬期のトイレ閉鎖

#### 姫川源流自然探勝園（`20000000-0000-4000-8000-000000000104`）

- 座標の取り方: 公式ページに載る座標（白馬村の文化財ページの地図リンク）
- <https://www.vill.hakuba.nagano.jp/spots/himekawa-headwaters-nature-exploration-garden/>: 見頃・散策路1時間30分
- <https://www.vill.hakuba.lg.jp/gyosei/soshikikarasagasu/shogaigakushusportska/hakubamurakominkan/3/bunkazai/8032.html>: 名水百選・源流の特徴・親海湿原・植物・座標
- <https://www.vill.hakuba.nagano.jp/hakuba-cycling/en/find-looking/himekawa/>: 所在地（神城佐野）・自転車乗り入れ禁止

#### 白馬ガラス工房GAKU（`20000000-0000-4000-8000-000000000105`）

- 座標の取り方: OpenStreetMap の施設の位置（公式の住所・地図と照合）。住所は北城瑞穂3020-52
- <https://www.hakuba-gaku.com/>: 営業時間・定休日・予約の方法
- <https://www.hakuba-gaku.com/pages/3315714/page_201910191033>: 体験の模様・料金・対象年齢
- <https://www.hakuba-gaku.com/pages/3202221/access>: 住所・行き方

#### 貞麟寺（`20000000-0000-4000-8000-000000000106`）

- 座標の取り方: OpenStreetMap の施設の位置（公式の住所・地図と照合）。住所は神城沢渡6482
- <https://www.vill.hakuba.nagano.jp/spots/teirinji/>: 住所・桜・カタクリ・見頃
- <https://www.vill.hakuba.lg.jp/gyosei/soshikikarasagasu/shogaigakushusportska/hakubamurakominkan/3/bunkazai/8023.html>: 天然記念物・麻蒔糸桜の由来

#### おやきの山愛（`20000000-0000-4000-8000-000000000107`）

- 座標の取り方: 公式ページの埋め込み地図の中心（白馬村公式観光サイト）。住所は北城3020-463
- <https://yamaai.sakura.ne.jp/>: 営業時間・生地・種類・喫茶・発送
- <https://www.vill.hakuba.nagano.jp/spots/yamaai/>: 観光サイト掲載・住所

#### Kitchen＆Marché 農かふぇ（`20000000-0000-4000-8000-000000000108`）

- 座標の取り方: 公式ページの埋め込み地図の中心（白馬村公式観光サイト）。住所は神城23603
- <https://www.farmhakuba.jp/sightseeing.html>: 店名・営業時間・定休日・メニュー・JGAP・3つの星レストラン・売店・テラス席
- <https://www.vill.hakuba.nagano.jp/spots/nohcafe/>: 観光サイト掲載・住所

### 大町市

#### 塩の道ちょうじや（`20000000-0000-4000-8000-000000000201`）

- 座標の取り方: 公式ページの埋め込み地図の中心（大町市観光協会）。住所は八日町2572
- <http://www.alps.or.jp/choujiya/museum.html>: 住所・時間・料金・歴史・所要時間・カフェ
- <https://kanko-omachi.gr.jp/spot/choujiya/>: 展示内容・季節の時間

#### 若一王子神社（`20000000-0000-4000-8000-000000000202`）

- 座標の取り方: 国土地理院ジオコーダー（住所）（大町2097）
- <https://kanko-omachi.gr.jp/spot/nyakuichi/>: 住所・文化財・流鏑馬
- <https://www.city.omachi.nagano.jp/00014000/00014100/00149401/00151201/00151001.html>: 所在地・由緒・祭りの日程

#### ぽかぽかランド美麻（`20000000-0000-4000-8000-000000000203`）

- 座標の取り方: OpenStreetMap の施設の位置（公式の住所・地図と照合）（道の駅の建物）。住所は美麻青具16784
- <https://www.miasa-pokapokaland.com/>: 住所・時間・泉質・北投石の湯・行き方
- <https://kanko-omachi.gr.jp/spot/pokapokaland/>: 道の駅・料理
- <https://www.city.omachi.nagano.jp/00021000/00023101/pokapoka_2.html>: 時間・北投石の湯

#### ゆいせきや（`20000000-0000-4000-8000-000000000204`）

- 座標の取り方: 国土地理院ジオコーダー（住所）（大町3205）
- <https://kanko-omachi.gr.jp/spot/yuisekiya/>: 住所・時間・定休日・料金・内容
- <https://kanko-omachi.gr.jp/event/91189/>: 作品展「みんなの一閑張り」（2025年）

#### 創舎 わちがい（`20000000-0000-4000-8000-000000000205`）

- 座標の取り方: 国土地理院ジオコーダー（住所）（大町4084）
- <https://www.wachigai.com/>: 住所・時間・定休日・予約制・行き方
- <https://www.wachigai.com/about>: 屋号・建物の歴史
- <https://kanko-omachi.gr.jp/spot/wachigai/>: 1階・2階の構成・郷土料理

#### 居谷里湿原（`20000000-0000-4000-8000-000000000206`）

- 座標の取り方: OpenStreetMap の施設の位置（公式の住所・地図と照合）（湿原の範囲の中心）
- <https://kanko-omachi.gr.jp/spot/iyarishitsugen/>: 所在地・指定・広さ・花・遊歩道・木道の修理

#### 中綱湖（`20000000-0000-4000-8000-000000000207`）

- 座標の取り方: OpenStreetMap の施設の位置（公式の住所・地図と照合）（湖の中心）
- <https://kanko-omachi.gr.jp/spot/nakatsunako/>: 仁科三湖・桜・リフレクション・ワカサギ
- <https://kanko-omachi.gr.jp/news/67744/>: 臨時駐車場・路上駐車と民有地のお願い

#### 鷹狩山（`20000000-0000-4000-8000-000000000208`）

- 座標の取り方: OpenStreetMap の施設の位置（公式の住所・地図と照合）（山頂）
- <https://kanko-omachi.gr.jp/spot/takagariyama/>: 眺望・雲海・行き方・冬期通行止め
- <https://kanko-omachi.gr.jp/blog/88849/>: 夜景・恋人の聖地（観光協会の記事）
- <https://www.city.omachi.nagano.jp/panorama/takagari/>: 市のライブカメラ

### 池田町

#### 池田八幡神社（`20000000-0000-4000-8000-000000000301`）

- 座標の取り方: OpenStreetMap の施設の位置（公式の住所・地図と照合）（町の文化財ページの「池田三丁目・役場の南」と照合）
- <https://www.ikedamachi.net/0000000356.html>: 所在地・社殿・役居門・十二社（町の文化財）
- <https://ikeda-kanko.jp/kanko/kankospot/%e6%b1%a0%e7%94%b0%e5%85%ab%e5%b9%a1%e7%a5%9e%e7%a4%be%e4%be%8b%e5%a4%a7%e7%a5%ad/>: 例大祭・歴史

#### あづみ野池田クラフトパーク（`20000000-0000-4000-8000-000000000302`）

- 座標の取り方: OpenStreetMap の施設の位置（公式の住所・地図と照合）（公園の範囲の中心）
- <https://ikeda-kanko.jp/kanko/kankospot/craft-park/>: 住所・標高・認定・駐車場
- <https://www.ikedamachi.net/0000000317.html>: 施設・桜・アクセス・禁止事項

#### 北アルプス展望美術館（`20000000-0000-4000-8000-000000000303`）

- 座標の取り方: 国土地理院ジオコーダー（住所）（会染7782）
- <https://navam.jp/>: 住所・開館時間・冬季休館・展示
- <https://navam.jp/guide/>: 料金・休館日
- <https://navam.jp/contact/>: 行き方・駐車場

#### 夢農場（`20000000-0000-4000-8000-000000000304`）

- 座標の取り方: OpenStreetMap の施設の位置（公式の住所・地図と照合）（農場の売店）。住所は陸郷7454-6
- <https://ikeda-kanko.jp/kanko/kankospot/yume-farm/>: 住所・営業時間・花・体験
- <https://db.go-nagano.net/topics_detail6/id=6123>: ラベンダー畑の広さ・行き方・駐車場
- <https://yume-farm.amebaownd.com/>: 2026年の営業（ラベンダー祭りの告知）
- <https://ikeda-kanko.jp/kanko/kankospot/ousenkyou/>: 桜仙峡の散策コースの発着点

#### 花紋大雪渓（`20000000-0000-4000-8000-000000000305`）

- 座標の取り方: 国土地理院ジオコーダー（住所）（会染9642）
- <https://www.jizake.co.jp/access.html>: 住所・営業時間・土日祝の営業・主屋・試飲
- <https://www.jizake.co.jp/tour.html>: 蔵見学の条件
- <https://db.go-nagano.net/topics_detail6/id=18136>: 古民家の由来・休業日・車の行き方

#### カフェ風のいろ（`20000000-0000-4000-8000-000000000306`）

- 座標の取り方: 国土地理院ジオコーダー（住所）（池田919）。OpenStreetMap の位置とも一致
- <https://ikeda-kanko.jp/kanko/gohan/kazenoiro/>: 住所・営業時間・定休日・料金・特徴

#### HOP FROG CAFE（`20000000-0000-4000-8000-000000000307`）

- 座標の取り方: 国土地理院ジオコーダー（住所）（池田1912）
- <https://hopfrogcafe.biz/>: 住所・店の成り立ち・泊まれるカフェ
- <https://ikeda-kanko.jp/kanko/gohan/hop-frog-cafe/>: 営業時間・定休日・料理・RV パーク

#### 発酵と暮らし おはこ（`20000000-0000-4000-8000-000000000308`）

- 座標の取り方: 国土地理院ジオコーダー（住所）（池田811）
- <https://ikeda-kanko.jp/kanko/gohan/ohako/>: 住所・営業時間・定休日・特徴・席数

### 安曇野市

#### 豊科温泉 湯多里山の神（`20000000-0000-4000-8000-000000000401`）

- 座標の取り方: OpenStreetMap の施設の位置（公式の住所・地図と照合）。住所は豊科田沢7994
- <https://www.yuttari-yamanokami.jp/index.html>: 営業時間・定休日・料金・行き方
- <https://www.yuttari-yamanokami.jp/kannai.html>: 館内・野菜市・割引の日
- <https://azumino-e-tabi.net/archives/spa/%e8%b1%8a%e7%a7%91%e6%b8%a9%e6%b3%89%e3%80%80%e6%b9%af%e5%a4%9a%e9%87%8c%e5%b1%b1%e3%81%ae%e7%a5%9e>: 住所・露天の岩風呂

#### ほりでーゆ〜四季の郷（`20000000-0000-4000-8000-000000000402`）

- 座標の取り方: 国土地理院ジオコーダー（住所）（堀金烏川11）
- <http://www.holiday-you.co.jp/dayuse.html>: 日帰り入浴の時間・料金・浴場
- <http://www.holiday-you.co.jp/access.html>: 住所・行き方・周辺の施設まで徒歩の時間
- <http://www.holiday-you.co.jp/>: 売店の時間と品ぞろえ
- <https://azumino-e-tabi.net/archives/spa/%e5%ae%89%e6%9b%87%e9%87%8e%e8%9d%b6%e3%83%b6%e5%b2%b3%e6%b8%a9%e6%b3%89%e3%80%80%e3%81%bb%e3%82%8a%e3%81%a7%e3%83%bc%e3%82%86%ef%bd%9e%e5%9b%9b%e5%ad%a3%e3%81%ae%e9%83%b7>: ラジウム温泉

#### 安曇野市天蚕センター（`20000000-0000-4000-8000-000000000403`）

- 座標の取り方: 国土地理院ジオコーダー（住所）（穂高有明3618）
- <https://azumino-tensan.jp/center/center.html>: 沿革・展示・工房・飼育期間
- <https://azumino-tensan.jp/center/access.html>: 開館時間・休館日・行き方
- <https://www.city.azumino.nagano.jp/soshiki/32/10247.html>: 住所・入館無料

#### 貞享義民記念館（`20000000-0000-4000-8000-000000000404`）

- 座標の取り方: 公式ページに載る座標（安曇野市観光協会）。住所は三郷明盛3209
- <https://www.city.azumino.nagano.jp/site/gimin/1974.html>: 開館時間・休館日・料金
- <https://www.city.azumino.nagano.jp/site/gimin/40740.html>: 行き方・駐車場
- <https://azumino-e-tabi.net/archives/look/%e8%b2%9e%e4%ba%ab%e7%be%a9%e6%b0%91%e8%a8%98%e5%bf%b5%e9%a4%a8>: 住所・座標・展示内容

#### 長峰山（`20000000-0000-4000-8000-000000000405`）

- 座標の取り方: OpenStreetMap の施設の位置（公式の住所・地図と照合）（山頂）。展望台の住所は明科中川手6805-184
- <https://db.go-nagano.net/topics_detail6/id=6056>: 住所・見学自由・行き方・駐車場・冬季閉鎖・山桜・夕日
- <https://www.city.azumino.nagano.jp/soshiki/30/91218.html>: 林道長峰線
- <http://www.holiday-you.co.jp/access.html>: 三川合流の眺め

#### 御宝田遊水池（`20000000-0000-4000-8000-000000000406`）

- 座標の取り方: OpenStreetMap の施設の位置（公式の住所・地図と照合）（池の中心）
- <https://db.go-nagano.net/topics_detail6/id=5958>: 所在地・行き方・駐車場・飛来時期
- <https://www.city.azumino.nagano.jp/soshiki/32/10321.html>: 1984年からの飛来・観察のマナー
- <https://www.city.azumino.nagano.jp/soshiki/32/10317.html>: トイレ・足元

#### 烏川渓谷緑地（`20000000-0000-4000-8000-000000000407`）

- 座標の取り方: 国土地理院ジオコーダー（住所）（堀金烏川26、水辺エリアの管理事務所）
- <https://karasugawa.com/guide>: 開所時間・閉所日・入園無料・冬季のトイレ・バリアフリー
- <https://karasugawa.com/park_outline>: エリア・面積
- <https://karasugawa.com/access>: 住所・行き方

#### 三郷サラダ市（`20000000-0000-4000-8000-000000000408`）

- 座標の取り方: 国土地理院ジオコーダー（住所）（三郷温5896）
- <https://www.city.azumino.nagano.jp/soshiki/29/63275.html>: 住所・時間・定休日・品目・行き方

### 松本市

#### 松本市はかり資料館（`20000000-0000-4000-8000-000000000501`）

- 座標の取り方: 国土地理院ジオコーダー（住所）（中央三丁目4-21）
- <https://matsu-haku.com/hakari/info>: 住所・開館時間・休館日・料金
- <https://matsu-haku.com/hakari/shisetsu>: 建物・展示室
- <https://www.city.matsumoto.nagano.jp/soshiki/145/4463.html>: 中町通り・沿革

#### ホットプラザ浅間（`20000000-0000-4000-8000-000000000502`）

- 座標の取り方: 国土地理院ジオコーダー（住所）（浅間温泉三丁目16）。OpenStreetMap の位置とも一致
- <https://hotplaza.jp/>: 住所・営業時間・定休日・料金
- <https://visitmatsumoto.com/spot/detail_1043.html>: 市営・浴槽・足湯・バス路線

#### 手仕事商會 すぐり（`20000000-0000-4000-8000-000000000503`）

- 座標の取り方: OpenStreetMap の施設の位置（公式の住所・地図と照合）。住所は中央3-2-13
- <https://suguritemari.jp/>: 正式名・住所・営業時間・定休日・蔵・草木染めの糸
- <https://visitmatsumoto.com/plan/detail_5073.html>: 体験の内容・所要時間・予約・行き方

#### ファーマーズガーデンうちだ（`20000000-0000-4000-8000-000000000504`）

- 座標の取り方: OpenStreetMap の施設の位置（公式の住所・地図と照合）。住所は内田792-7
- <https://www.ja-m.iijan.or.jp/market/store/000244.html>: 住所・営業時間・定休日・品目
- <https://visitmatsumoto.com/spot/detail_1175.html>: 眺望・品ぞろえ・行き方

#### 源智の井戸（`20000000-0000-4000-8000-000000000505`）

- 座標の取り方: OpenStreetMap の施設の位置（公式の住所・地図と照合）。所在地は中央3-741
- <https://www.city.matsumoto.nagano.jp/soshiki/134/4004.html>: 所在地・由来・名水百選・御膳水
- <https://blog.visitmatsumoto.com/culture/%E6%BA%90%E6%99%BA%E3%81%AE%E4%BA%95%E6%88%B8%E3%81%A8%E6%BA%90%E6%99%BA%E3%81%AE%E3%81%9D%E3%81%B0%E3%80%80%E3%81%BE%E3%81%A4%E3%82%82%E3%81%A8%E6%B9%A7%E6%B0%B4%E5%B7%A1%E3%82%8A%EF%BC%86%E3%81%AF/>: 水源・井筒

#### 馬場家住宅（`20000000-0000-4000-8000-000000000506`）

- 座標の取り方: 国土地理院ジオコーダー（住所）（内田357）
- <https://www.city.matsumoto.nagano.jp/soshiki/141/4450.html>: 住所・開館時間・休館日・料金・行き方
- <https://www.city.matsumoto.nagano.jp/soshiki/141/4451.html>: 重要文化財・建物・ケヤキ・眺め

#### 弘法山古墳（`20000000-0000-4000-8000-000000000507`）

- 座標の取り方: 公式ページに載る座標（松本市公式観光サイト）
- <https://visitmatsumoto.com/spot/detail_1126.html>: 住所・座標・行き方・駐車場・眺望・見頃
- <https://www.city.matsumoto.nagano.jp/soshiki/134/3774.html>: 年代・規模・国史跡・桜の本数

#### 城山公園（`20000000-0000-4000-8000-000000000508`）

- 座標の取り方: 公式ページに載る座標（松本市公式観光サイト）
- <https://www.city.matsumoto.nagano.jp/soshiki/134/3977.html>: 所在地・由来・特別名勝・眺望・歌碑
- <https://visitmatsumoto.com/spot/detail_1178.html>: 住所・座標・行き方・駐車場
