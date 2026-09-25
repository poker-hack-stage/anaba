# 口コミ・投稿の管理（非表示・削除・緊急停止）

口コミとスポットの投稿は、ログインなし・承認なしですぐ公開される（`docs/spec.md` 画面-4、#51）。荒れたときは、この手順で管理者があとから非表示にする・消す（#55）。

管理用の画面はない。Supabase のダッシュボード（本番のプロジェクト）の **SQL Editor** で、下の SQL の `<…>` を書き換えて実行する。

- SQL Editor は `postgres` の権限で動くので、RLS に関係なく非表示の行も見える・変えられる
- 非表示（`status = 'hidden'`）にした行は、公開の読み取り（RLS と `published_reviews`）に出なくなる。アプリはデータをキャッシュしていないので、次にページを読み込んだときから画面と AI旅プランに出ない（開いたままの画面には残る）
- 迷ったら、まず非表示にする（戻せる）。消す（`delete`）と戻せない
- SQL Editor は時刻を UTC で表示する（日本時間より9時間前）。1 の一覧は、時刻を日本時間（`created_at_jst`）で出している。SQL に時刻を書くときは、`'2026-10-01 13:00+09'` のように `+09` を付けて日本時間で書く

## 1. 最近の書き込みを見る

```sql
-- 口コミ（新しい順。非表示のものも出る）
select r.id, r.created_at at time zone 'Asia/Tokyo' as created_at_jst, r.status, s.name as spot, r.nickname, r.rating, r.body, r.client_hash
from reviews r
join spots s on s.id = r.spot_id
order by r.created_at desc
limit 50;

-- 投稿されたスポット（新しい順。投稿はすぐ公開されるので、承認の手順はない）
select s.id, s.created_at at time zone 'Asia/Tokyo' as created_at_jst, s.status, a.name as area, s.name, s.category, s.description, s.nickname, h.client_hash
from spots s
join areas a on a.id = s.area_id
left join spot_client_hashes h on h.spot_id = s.id
where s.source = 'user'
order by s.created_at desc
limit 50;
```

`client_hash` は、送信元の IP と `RATE_LIMIT_SALT` から作ったハッシュ（生の IP は残していない）。同じ IP からの口コミと投稿には、同じ値が入る。空（`null`）の行は、API を通らずに公開キーで直接書き込まれたもの（下の「API を通らない書き込み」）。

## 2. 口コミ

```sql
-- 非表示にする
update reviews set status = 'hidden' where id = '<口コミの id>';

-- 戻す
update reviews set status = 'published' where id = '<口コミの id>';

-- 消す（戻せない）
delete from reviews where id = '<口コミの id>';

-- 同じ送信元（client_hash）の口コミをまとめて非表示にする
update reviews set status = 'hidden'
where client_hash = (select client_hash from reviews where id = '<荒らしの口コミの id>');
```

## 3. 投稿されたスポット

`and source = 'user'` を必ず付ける（シードのスポットを誤って変えないため）。

```sql
-- 非表示にする（そのスポットの口コミも画面に出なくなる）
update spots set status = 'hidden' where id = '<スポットの id>' and source = 'user';

-- 戻す
update spots set status = 'published' where id = '<スポットの id>' and source = 'user';

-- 消す（戻せない。そのスポットの口コミと spot_client_hashes の行も一緒に消える）
delete from spots where id = '<スポットの id>' and source = 'user';

-- 同じ送信元（client_hash）の投稿をまとめて非表示にする
update spots set status = 'hidden'
where source = 'user'
  and id in (
    select spot_id from spot_client_hashes
    where client_hash = (select client_hash from spot_client_hashes where spot_id = '<荒らしのスポットの id>')
  );
```

同じ送信元の口コミも一緒に非表示にするなら、2 の `client_hash` の SQL で、値を直接書く（`where client_hash = '<client_hash>'`）。

## 4. API を通らない書き込み

公開キーはブラウザに出ているので、API（#52）を通らずに直接 `submit_spot()` を呼んだり `reviews` に insert したりできる。このとき `client_hash` は省ける（空になる）か、でたらめな値を渡せるので、3 の「同じ送信元」では拾えない（PR #63 の再レビュー S2）。時刻と地域で絞って非表示にする。

```sql
-- client_hash のない投稿を、荒らしが始まった時刻から後だけ非表示にする
update spots set status = 'hidden'
where source = 'user'
  and created_at > '<荒らしが始まった時刻>'
  and not exists (select 1 from spot_client_hashes h where h.spot_id = spots.id);

-- client_hash のない口コミを、荒らしが始まった時刻から後だけ非表示にする
update reviews set status = 'hidden'
where client_hash is null
  and created_at > '<荒らしが始まった時刻>';

-- でたらめな client_hash を渡された場合（書き込むたびに値を変えられる）: 時刻と地域で絞って、投稿をまとめて非表示にする
-- （その地域の、その時刻より後の正常な投稿も一緒に隠れる。あとで 1 の一覧を見て、正常なものだけ戻す）
update spots set status = 'hidden'
where source = 'user'
  and area_id = '<地域の id>'
  and created_at between '<始まった時刻>' and '<終わった時刻>';

-- 口コミも同じく、時刻とスポットで絞ってまとめて非表示にする（そのスポットの正常な口コミも一緒に隠れる）
update reviews set status = 'hidden'
where spot_id = '<スポットの id>'
  and created_at between '<始まった時刻>' and '<終わった時刻>';
```

地域の id は `select id, name, prefecture from areas order by prefecture, name;` で調べる。

## 5. 上限を使い切られたとき

DB が数える上限（`submit_spot()`・口コミのトリガー）:

| 書き込み | 全体        | ひとつあたり      |
| -------- | ----------- | ----------------- |
| 投稿     | 1時間に20件 | 1地域に1時間5件   |
| 口コミ   | 1分に30件   | 1スポットに1分5件 |

上限は、**非表示にした行も数える**（`created_at` だけで数えている）。荒らしに全体の上限を使い切られると、正常な投稿も最大1時間は 429（「投稿が混み合っています」）になる。止まり続けて困るときは、荒らしの行を消す（`delete`）か、7 の緊急停止をする。

```sql
-- 直近1時間の投稿の数（20 に達していれば、投稿は受け付けられない）
select count(*) from spots where source = 'user' and created_at > now() - interval '1 hour';
```

同じ IP からの回数（API の `check_rate_limit()`。口コミは10分に3件、投稿は1時間に2件）は `rate_limits` で数えている。**同じ IP を使う人どうしは、この回数を分け合う。** 発表の会場のように、みんなが同じ Wi-Fi から書き込むと、会場全体で口コミは10分に3件、投稿は1時間に2件までになる（429「続けて投稿されています」）。デモで書き込んでもらう直前に、8 の `truncate rate_limits` で回数を0に戻すと、その区切りの残りの回数を使える（AI旅プランの回数も0に戻る）。

## 6. NG ワードを足す

NG ワードに当たった書き込みは、DB で断る（400「使えない言葉が含まれています」）。足したあとの書き込みにだけ効き、すでにある行は変わらない（2・3 で非表示にする）。

```sql
-- 足す（全角・半角・大文字小文字は区別せずに当たる）
insert into ng_words (word) values ('<語>') on conflict do nothing;

-- 一覧
select word, created_at from ng_words order by created_at desc;

-- 外す
delete from ng_words where word = '<語>';
```

短すぎる語（1〜2文字）は、関係ない書き込みにも当たりやすいので避ける。

初期値（5語）は `supabase/seed.sql` にある。本番の公開の前に `select count(*) from ng_words;` で入っていることを確かめる。

## 7. 緊急停止

口コミ・投稿の受け付けを全部止める。API（#52）は 503（`closed`「いまは受け付けていません」）を返し、口コミの欄・投稿フォーム（#53・#54）はその文を出す。表示（口コミの一覧・スポット）と AI旅プランはそのまま動く。

```sql
-- 止める
revoke insert on reviews from anon;
revoke execute on function submit_spot(uuid, text, text, text, double precision, double precision, text, text) from anon;
```

```sql
-- 戻す（口コミは、書ける列を限って戻す。列を限らない grant にしない）
grant insert (spot_id, nickname, rating, body, client_hash) on reviews to anon;
grant execute on function submit_spot(uuid, text, text, text, double precision, double precision, text, text) to anon;
```

`check_rate_limit()` の権限は外さない。AI旅プランの `/api/plan` も使っているので、外すと旅プランが Gemini を使わずデモモードになる。

## 8. rate_limits の見張りと掃除

`rate_limits` は、送信元ごとの回数を時間の区切りごとに1行で持つ。`check_rate_limit()` がおよそ100回に1回、2日より古い行を消しているが、IP やハッシュを変えながら書き込まれると行が増える（PR #63 からの申し送り）。発表の前後に行数を見る。

```sql
-- 行数（数千行までなら問題ない）と、いちばん古い区切り
select count(*), min(window_start) from rate_limits;

-- 古い区切りの行を消す（いちばん長い区切りは1時間なので、1日より前の行はもう使わない）
delete from rate_limits where window_start < now() - interval '1 day';

-- あふれて困るときは全部消す（全員の回数が0に戻る。荒らしの回数も戻るので、落ち着いてからにする）
truncate rate_limits;
```
