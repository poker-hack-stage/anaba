# 市区町村の候補と、公開待ちの候補（穴場を教える）

「穴場を教える」は47都道府県から投稿できる。市区町村は入力して候補から選び、地図のどこにでもピンを置ける。
ピンが anaba の地域（`areas`）の中ならすぐ公開、外なら「公開待ちの候補」（`spot_candidates`）として非公開で保存する（docs/spec.md 6.4）。

## 市区町村の候補（lib/geo/municipalities.json）

`scripts/municipalities/build.mjs` が作る。手で編集しない。

| 項目       | 内容                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| データ     | Geolonia 住所データ（<https://github.com/geolonia/japanese-addresses>）の `api/ja.json`（都道府県・市区町村）と町丁目ごとの代表点   |
| 元の出典   | 国土交通省 位置参照情報、日本郵便 郵便番号データ（Geolonia の README による）                                                       |
| ライセンス | CC BY 4.0（<https://creativecommons.org/licenses/by/4.0/deed.ja>）                                                                  |
| 加工       | 政令指定都市の区を市にまとめ、郡の名前を外した。町丁目の代表点から市区町村ごとのおおよその範囲（外枠）を求め、座標を小数3桁に丸めた |
| 表示       | 投稿フォームの市区町村の欄の下に「市区町村の候補: Geolonia 住所データ（CC BY 4.0）」を出す                                          |

作り直すとき:

```
git clone --depth 1 https://github.com/geolonia/japanese-addresses.git /tmp/japanese-addresses
node scripts/municipalities/build.mjs /tmp/japanese-addresses
```

## 公開待ちの候補を公開する（管理者）

1. 新しい地域を `areas` に足す（境界も入れる。docs/boundaries.md）
2. Supabase の SQL Editor で次を実行する。どこかの地域の中に入った `pending` の候補が `spots` に入って公開され、候補は `published` になる。戻り値は公開した件数

   ```sql
   select public.publish_spot_candidates();
   ```

公開しない候補は `update public.spot_candidates set status = 'rejected' where id = '…';` にする。
どの町に候補がたまっているかは、次で見られる（次に足す地域を決める材料になる）。

```sql
select prefecture, municipality, count(*)
from public.spot_candidates
where status = 'pending'
group by 1, 2
order by 3 desc;
```
