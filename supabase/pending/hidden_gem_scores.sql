-- 北アルプス山麓5地域のスポットの穴場度（#30）
-- #61（hidden_gem_score 列を足すマイグレーション）がマージされてから流す。seed.sql からは読まない。
-- 値と根拠は docs/spot-sources.md の表、基準は docs/spot-scores.md（#61）。
-- #61 のマージ後は、この値を seed.sql の insert に移し（列を足す）、このファイルを消す。

-- 白馬村
update public.spots set hidden_gem_score = 3 where id = '20000000-0000-4000-8000-000000000101'; -- 白馬塩の道温泉 倉下の湯
update public.spots set hidden_gem_score = 3 where id = '20000000-0000-4000-8000-000000000102'; -- 青鬼集落
update public.spots set hidden_gem_score = 2 where id = '20000000-0000-4000-8000-000000000103'; -- 大出公園
update public.spots set hidden_gem_score = 3 where id = '20000000-0000-4000-8000-000000000104'; -- 姫川源流自然探勝園
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000105'; -- 白馬ガラス工房GAKU
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000106'; -- 貞麟寺
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000107'; -- おやきの山愛
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000108'; -- Kitchen＆Marché 農かふぇ
-- 大町市
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000201'; -- 塩の道ちょうじや
update public.spots set hidden_gem_score = 3 where id = '20000000-0000-4000-8000-000000000202'; -- 若一王子神社
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000203'; -- ぽかぽかランド美麻
update public.spots set hidden_gem_score = 5 where id = '20000000-0000-4000-8000-000000000204'; -- ゆいせきや
update public.spots set hidden_gem_score = 3 where id = '20000000-0000-4000-8000-000000000205'; -- 創舎 わちがい
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000206'; -- 居谷里湿原
update public.spots set hidden_gem_score = 3 where id = '20000000-0000-4000-8000-000000000207'; -- 中綱湖
update public.spots set hidden_gem_score = 3 where id = '20000000-0000-4000-8000-000000000208'; -- 鷹狩山
-- 池田町
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000301'; -- 池田八幡神社
update public.spots set hidden_gem_score = 3 where id = '20000000-0000-4000-8000-000000000302'; -- あづみ野池田クラフトパーク
update public.spots set hidden_gem_score = 3 where id = '20000000-0000-4000-8000-000000000303'; -- 北アルプス展望美術館
update public.spots set hidden_gem_score = 3 where id = '20000000-0000-4000-8000-000000000304'; -- 夢農場
update public.spots set hidden_gem_score = 3 where id = '20000000-0000-4000-8000-000000000305'; -- 花紋大雪渓
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000306'; -- カフェ風のいろ
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000307'; -- HOP FROG CAFE
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000308'; -- 発酵と暮らし おはこ
-- 安曇野市
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000401'; -- 豊科温泉 湯多里山の神
update public.spots set hidden_gem_score = 3 where id = '20000000-0000-4000-8000-000000000402'; -- ほりでーゆ〜四季の郷
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000403'; -- 安曇野市天蚕センター
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000404'; -- 貞享義民記念館
update public.spots set hidden_gem_score = 3 where id = '20000000-0000-4000-8000-000000000405'; -- 長峰山
update public.spots set hidden_gem_score = 3 where id = '20000000-0000-4000-8000-000000000406'; -- 御宝田遊水池
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000407'; -- 烏川渓谷緑地
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000408'; -- 三郷サラダ市
-- 松本市
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000501'; -- 松本市はかり資料館
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000502'; -- ホットプラザ浅間
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000503'; -- 手仕事商會 すぐり
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000504'; -- ファーマーズガーデンうちだ
update public.spots set hidden_gem_score = 2 where id = '20000000-0000-4000-8000-000000000505'; -- 源智の井戸
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000506'; -- 馬場家住宅
update public.spots set hidden_gem_score = 2 where id = '20000000-0000-4000-8000-000000000507'; -- 弘法山古墳
update public.spots set hidden_gem_score = 4 where id = '20000000-0000-4000-8000-000000000508'; -- 城山公園
