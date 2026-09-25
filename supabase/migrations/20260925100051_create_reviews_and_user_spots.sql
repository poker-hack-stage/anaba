-- 口コミ・スポットの投稿（ログインなしの匿名）の DB 側（docs/spec.md 画面-4、#51）
--   reviews            : スポットの口コミ。書いたらすぐ公開し、管理者があとから hidden にできる
--   published_reviews  : 公開してよい口コミの、公開してよい列だけのビュー
--   submit_spot()      : 「穴場を教える」の投稿。検査して spots に source = 'user' ですぐ公開で入れる。
--                        管理者があとから spots.status を hidden にできる
--   spot_client_hashes : 投稿したスポットの client_hash（公開しない）
--   rate_limits        : IP ごとのレート制限の回数（check_rate_limit() が使う。#52・#25）
--   ng_words           : NG ワード。管理者があとから足す（#55）
--
-- 書き込むのは anon ロール（ログインがないため）。公開キーはブラウザに出ているので、
-- API（#52）を通らない直接の insert・rpc でも荒らしを止められるよう、権限とトリガー・関数で守る。
--
-- トリガー・submit_spot() が返すエラー（#52 が HTTP のステータスに変える）
--   AN001 : NG ワードを含む（400。どの語に当たったかは返さない）
--   AN002 : URL を含む（400）
--   AN003 : 連投（同じ本文の口コミ・同じ名前のスポット）（429）
--   AN004 : 全体の上限を超えた（429）
--   ほかに check 制約違反・長さ・見えない文字だけの入力・続く改行は 23514（400）、
--   存在しない（か非表示の）スポット・地域は 23503（400）、場所が地域の範囲の外・形の違う引数は 22023（400）、
--   指定できない列を指定したときは 42501

-- ---------------------------------------------------------------------------
-- spots に足す列
--   source   : seed（seed / Studio / マイグレーションで入れたもの）/ user（submit_spot() で投稿されたもの）
--   status   : published / hidden。hidden は公開の読み取り（RLS）に出ない。管理者があとから変える（#55）
--   nickname : 投稿した人のニックネーム（公開する）。source = 'user' の行では必須
-- ---------------------------------------------------------------------------

alter table public.spots
  add column source text not null default 'seed' check (source in ('seed', 'user')),
  add column status text not null default 'published' check (status in ('published', 'hidden')),
  add column nickname text check (char_length(nickname) <= 20),
  add constraint spots_user_nickname_check check (source = 'seed' or nickname is not null);

-- 投稿の連投・全体の上限の判定に使う
create index spots_user_created_at_idx on public.spots (created_at) where source = 'user';

-- ---------------------------------------------------------------------------
-- テーブル
-- ---------------------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots (id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) >= 1 and char_length(nickname) <= 20),
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(btrim(body)) >= 1 and char_length(body) <= 300),
  status text not null default 'published' check (status in ('published', 'hidden')),
  -- IP と RATE_LIMIT_SALT から作る SHA-256（#52 が入れる）。公開しない
  client_hash text check (char_length(client_hash) <= 128),
  created_at timestamptz not null default now()
);

-- スポット詳細の一覧（新しい順）と、連投・1スポットの上限の判定に使う
create index reviews_spot_id_created_at_idx on public.reviews (spot_id, created_at desc);
-- 全体の上限の判定に使う
create index reviews_created_at_idx on public.reviews (created_at);
-- 管理者が同じ client_hash をまとめて非表示にするとき（#55）に使う
create index reviews_client_hash_idx on public.reviews (client_hash);

-- 投稿したスポットの client_hash。spots の列にすると公開の読み取り（select *）に出てしまうので分ける
create table public.spot_client_hashes (
  spot_id uuid primary key references public.spots (id) on delete cascade,
  client_hash text not null check (client_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

-- 管理者が同じ client_hash のスポットをまとめて非表示にするとき（#55）に使う
create index spot_client_hashes_client_hash_idx on public.spot_client_hashes (client_hash);

create table public.rate_limits (
  -- '<種類>:<client_hash>'（種類は review・submission・plan。client_hash は SHA-256 の16進64文字）。
  -- 作るのは呼ぶ側（#52・#25）。形は check_rate_limit() が確かめる
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

-- 古い行の掃除に使う
create index rate_limits_window_start_idx on public.rate_limits (window_start);

create table public.ng_words (
  -- 空文字だとすべての書き込みに当たってしまうので、空白だけの語も拒否する
  word text primary key check (char_length(btrim(word)) >= 1 and char_length(word) <= 50),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 権限（RLS と列の権限）
-- Supabase は public のテーブルに anon・authenticated の全権限を既定で付けるので、
-- いったんすべて外してから必要なものだけ付ける
-- ---------------------------------------------------------------------------

alter table public.reviews enable row level security;
alter table public.spot_client_hashes enable row level security;
alter table public.rate_limits enable row level security;
alter table public.ng_words enable row level security;

revoke all on table public.reviews from anon, authenticated;
revoke all on table public.spot_client_hashes from anon, authenticated;
revoke all on table public.rate_limits from anon, authenticated;
revoke all on table public.ng_words from anon, authenticated;

-- anon は列を限った insert だけ。status・id・created_at は指定できない（既定値が入る）
grant insert (spot_id, nickname, rating, body, client_hash) on table public.reviews to anon;

-- select・update・delete のポリシーは作らない（anon は読めない・変えられない）
-- status の条件は列の権限と二重の守り
create policy "reviews: anon は公開の状態でだけ投稿可"
  on public.reviews for insert
  to anon
  with check (status = 'published');

-- spot_client_hashes・rate_limits・ng_words にはポリシーを作らない（anon・authenticated から見えない）

-- spots: anon・authenticated は公開の状態の行を読むだけ。書き込みは submit_spot() を通す。
-- アプリは areas.select("*, spots (*)") で読むので、非表示の行は RLS で落とす（読み出しのコードは変えない）
revoke all on table public.spots from anon, authenticated;
grant select on table public.spots to anon, authenticated;

drop policy "spots: 誰でも閲覧可" on public.spots;

create policy "spots: 公開の状態なら誰でも閲覧可"
  on public.spots for select
  to anon, authenticated
  using (status = 'published');

-- ---------------------------------------------------------------------------
-- 公開用のビュー
-- anon は reviews を読めないので、所有者の権限で読むビュー（security_invoker にしない）にして、
-- 公開してよい行と列だけを出す。security_barrier で、呼ぶ側の条件より先に status の条件を評価させる
-- 公開してよいデータなので、ログインしたままの人（authenticated）も読める
-- ---------------------------------------------------------------------------

create view public.published_reviews with (security_barrier = true) as
  select id, spot_id, nickname, rating, body, created_at
  from public.reviews
  where status = 'published';

revoke all on table public.published_reviews from anon, authenticated;
grant select on table public.published_reviews to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 荒らし対策のトリガー
-- anon は ng_words・reviews を読めないので security definer にする
-- ---------------------------------------------------------------------------

-- 比べる前に正規化する。全角の「ｈｔｔｐ」や半角カタカナ、見えない文字（ゼロ幅スペースなど）で
-- すり抜けさせず、空白や見えない文字だけの入力を空として扱うため
--   1. NFKC で正規化して小文字にする（全角スペースなども半角スペースになる）
--   2. 改行を \n にそろえる（\r\n・\r・U+0085・U+2028・U+2029・垂直タブ・改ページ）
--   3. タブを空白にする
--   4. 見えない文字を消す: 改行以外の制御文字、ソフトハイフン、ゼロ幅・書式の文字、
--      空白に見える文字（ハングルの空白・点字の空白）、異体字セレクタ、タグ文字
--   5. 空白を1つに畳み、改行の前後の空白と、全体の前後の空白・改行を削る
create or replace function public.normalize_for_moderation(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(lower(normalize(coalesce(p_text, ''), NFKC)), '\r\n?|[\u0085\u2028\u2029\v\f]', E'\n', 'g'),
            '\t', ' ', 'g'
          ),
          '[\x01-\x09\x0b-\x1f\x7f-\x9f\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u206f\u2800\u3164\ufe00-\ufe0f\ufeff\uffa0\U000e0000-\U000e007f]',
          '', 'g'
        ),
        ' +', ' ', 'g'
      ),
      ' ?\n ?', E'\n', 'g'
    ),
    E' \n'
  );
$$;

-- 空（正規化すると何も残らない）・続く改行を拒否する（check 制約と同じ 23514）
--   p_allow_newline: 本文・説明は改行を2つ続くまで許す。ニックネーム・スポット名は改行を許さない
create or replace function public.assert_visible_text(p_text text, p_allow_newline boolean)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_text text := public.normalize_for_moderation(p_text);
  -- 改行は、前後を削る前の形で数える（先頭・末尾に続く改行も拒否するため）。
  -- 両端に印を付けて正規化し、前後が削られないようにする
  v_untrimmed text := public.normalize_for_moderation('|' || coalesce(p_text, '') || '|');
begin
  if v_text = '' then
    raise exception using errcode = 'check_violation', message = '空白や見えない文字だけの入力はできません';
  end if;

  if p_allow_newline then
    if strpos(v_untrimmed, E'\n\n\n') > 0 then
      raise exception using errcode = 'check_violation', message = '改行は2つまでしか続けられません';
    end if;
  elsif strpos(v_untrimmed, E'\n') > 0 then
    raise exception using errcode = 'check_violation', message = '改行は入れられません';
  end if;
end;
$$;

-- NG ワード・URL を含んでいたら例外を出す
create or replace function public.assert_postable_text(p_text text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_text text := public.normalize_for_moderation(p_text);
begin
  if exists (
    select 1
    from public.ng_words w
    -- 正規化して空になる語は、すべての書き込みに当たってしまうので無視する
    where public.normalize_for_moderation(w.word) <> ''
      and strpos(v_text, public.normalize_for_moderation(w.word)) > 0
  ) then
    raise exception using errcode = 'AN001', message = '使えない言葉が含まれています';
  end if;

  if v_text ~ '(https?://|www\.)' then
    raise exception using errcode = 'AN002', message = 'URL は書けません';
  end if;
end;
$$;

create or replace function public.reviews_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 非表示のスポットには書けない（存在しないスポットと同じ 23503）
  if not exists (
    select 1 from public.spots s where s.id = new.spot_id and s.status = 'published'
  ) then
    raise exception using errcode = 'foreign_key_violation', message = 'スポットが見つかりません';
  end if;

  perform public.assert_visible_text(new.nickname, false);
  perform public.assert_visible_text(new.body, true);
  perform public.assert_postable_text(new.nickname || ' ' || new.body);

  -- 数えている間にほかの insert が入って上限を超えないよう、口コミの insert を直列にする
  perform pg_advisory_xact_lock(hashtext('public.reviews_before_insert'));

  -- 空白や見えない文字の違いですり抜けさせないよう、正規化してから比べる
  if exists (
    select 1
    from public.reviews r
    where r.spot_id = new.spot_id
      and public.normalize_for_moderation(r.body) = public.normalize_for_moderation(new.body)
      and r.created_at > now() - interval '10 minutes'
  ) then
    raise exception using errcode = 'AN003', message = '同じ口コミがすでに投稿されています';
  end if;

  if (
    select count(*) from public.reviews r where r.created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception using errcode = 'AN004', message = '投稿が混み合っています。しばらくしてからお試しください';
  end if;

  if (
    select count(*)
    from public.reviews r
    where r.spot_id = new.spot_id
      and r.created_at > now() - interval '1 minute'
  ) >= 5 then
    raise exception using errcode = 'AN004', message = '投稿が混み合っています。しばらくしてからお試しください';
  end if;

  return new;
end;
$$;

create trigger reviews_before_insert
  before insert on public.reviews
  for each row execute function public.reviews_before_insert();

-- ---------------------------------------------------------------------------
-- スポットの投稿（#52 の POST /api/spot-submissions が rpc で呼ぶ。#54）
-- 管理者の承認を待たずに、spots に source = 'user'・status = 'published' で入れる。
-- 荒れたら管理者が spots.status を hidden にする・行を消す（#55）
-- ---------------------------------------------------------------------------

-- 点（緯度・経度）が GeoJSON（Geometry・Feature・FeatureCollection）の Polygon・MultiPolygon の内側か。
-- 偶奇則で数えるので、穴（内側のリング）も扱える。
-- Polygon・MultiPolygon を1つも含まない、または座標が読めないときは null（呼ぶ側が別の方法で判定する）
create or replace function public.geojson_contains_point(
  p_geojson jsonb,
  p_lat double precision,
  p_lng double precision
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_ring jsonb;
  v_found boolean := false;
  v_inside boolean := false;
  v_n integer;
  v_x1 double precision;
  v_y1 double precision;
  v_x2 double precision;
  v_y2 double precision;
begin
  if p_geojson is null then
    return null;
  end if;

  -- strict にする（lax の .** は同じ値を2回返すことがある）
  for v_ring in
    select r from jsonb_path_query(p_geojson, 'strict $.** ? (@.type == "Polygon").coordinates[*]') r
    union all
    select r from jsonb_path_query(p_geojson, 'strict $.** ? (@.type == "MultiPolygon").coordinates[*][*]') r
  loop
    v_found := true;
    v_n := jsonb_array_length(v_ring);
    for i in 0 .. v_n - 1 loop
      -- GeoJSON の座標は [経度, 緯度]
      v_x1 := (v_ring -> i ->> 0)::double precision;
      v_y1 := (v_ring -> i ->> 1)::double precision;
      v_x2 := (v_ring -> ((i + 1) % v_n) ->> 0)::double precision;
      v_y2 := (v_ring -> ((i + 1) % v_n) ->> 1)::double precision;
      if (v_y1 > p_lat) <> (v_y2 > p_lat) then
        -- 上の条件で v_y1 <> v_y2 なので、0 で割らない
        if p_lng < (v_x2 - v_x1) * (p_lat - v_y1) / (v_y2 - v_y1) + v_x1 then
          v_inside := not v_inside;
        end if;
      end if;
    end loop;
  end loop;

  if not v_found then
    return null;
  end if;
  return v_inside;
exception
  -- 座標が数でない・形が違うなど。境界がないときと同じ扱いにする
  when others then
    return null;
end;
$$;

create or replace function public.submit_spot(
  p_area_id uuid,
  p_name text,
  p_category text,
  p_description text,
  p_lat double precision,
  p_lng double precision,
  p_nickname text,
  -- IP と RATE_LIMIT_SALT から作る SHA-256 の16進64文字（#52 が渡す）。spot_client_hashes に入れ、公開しない
  p_client_hash text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_area public.areas%rowtype;
  v_inside boolean;
  v_spot_id uuid;
begin
  -- 長さ（口コミの check 制約と同じ 23514）
  if p_nickname is null or char_length(p_nickname) > 20 then
    raise exception using errcode = 'check_violation', message = 'ニックネームは1〜20文字にしてください';
  end if;
  if p_name is null or char_length(p_name) > 40 then
    raise exception using errcode = 'check_violation', message = 'スポット名は1〜40文字にしてください';
  end if;
  if p_description is null or char_length(p_description) > 300 then
    raise exception using errcode = 'check_violation', message = 'ひとことは1〜300文字にしてください';
  end if;
  -- spots.category の check と同じ6種（lib/spots/categories.ts の CATEGORIES のキー）
  if p_category is null
    or p_category not in ('gourmet', 'nature', 'view', 'onsen', 'craft', 'history') then
    raise exception using errcode = 'check_violation', message = 'カテゴリが正しくありません';
  end if;

  perform public.assert_visible_text(p_nickname, false);
  perform public.assert_visible_text(p_name, false);
  perform public.assert_visible_text(p_description, true);
  perform public.assert_postable_text(p_nickname || ' ' || p_name || ' ' || p_description);

  if p_client_hash is not null and p_client_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'p_client_hash は16進64文字にしてください';
  end if;

  -- 場所: 巡回や AI旅プランに地域の外の場所が出ないよう、地域の範囲の中だけを受け付ける
  select * into v_area from public.areas a where a.id = p_area_id;
  if not found then
    raise exception using errcode = 'foreign_key_violation', message = '地域が見つかりません';
  end if;
  -- 日本のおおよその範囲（沖ノ鳥島〜択捉島、与那国島〜南鳥島）。NaN・Infinity もここで弾かれる
  if p_lat is null or p_lng is null
    or not (p_lat between 20 and 46 and p_lng between 122 and 154) then
    raise exception using errcode = '22023', message = '場所が日本の範囲の外です';
  end if;
  -- 境界（areas.boundary）があればその内側。なければ地域の中心から 50 km 以内
  -- （市町村の端までの距離のおおよその上限。北アルプス山麓の松本市でも中心から乗鞍まで約 40 km）
  v_inside := public.geojson_contains_point(v_area.boundary, p_lat, p_lng);
  if v_inside is null then
    v_inside := 6371 * 2 * asin(sqrt(
      power(sin(radians(p_lat - v_area.center_lat) / 2), 2)
      + cos(radians(v_area.center_lat)) * cos(radians(p_lat))
        * power(sin(radians(p_lng - v_area.center_lng) / 2), 2)
    )) <= 50;
  end if;
  if not v_inside then
    raise exception using errcode = '22023', message = '場所が地域の範囲の外です';
  end if;

  -- 数えている間にほかの投稿が入って上限を超えないよう、投稿を直列にする
  perform pg_advisory_xact_lock(hashtext('public.submit_spot'));

  -- 連投: 同じ地域に、正規化して同じ名前の投稿が24時間以内にあれば拒否する
  if exists (
    select 1
    from public.spots s
    where s.source = 'user'
      and s.area_id = p_area_id
      and s.created_at > now() - interval '24 hours'
      and public.normalize_for_moderation(s.name) = public.normalize_for_moderation(p_name)
  ) then
    raise exception using errcode = 'AN003', message = '同じスポットがすでに投稿されています';
  end if;

  if (
    select count(*)
    from public.spots s
    where s.source = 'user'
      and s.created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception using errcode = 'AN004', message = '投稿が混み合っています。しばらくしてからお試しください';
  end if;

  insert into public.spots (area_id, name, category, lat, lng, description, source, status, nickname)
  values (p_area_id, p_name, p_category, p_lat, p_lng, p_description, 'user', 'published', p_nickname)
  returning id into v_spot_id;

  if p_client_hash is not null then
    insert into public.spot_client_hashes (spot_id, client_hash) values (v_spot_id, p_client_hash);
  end if;

  return v_spot_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- レート制限（#52 の口コミ・投稿、#25 の /api/plan が使う）
-- 固定の時間枠で回数を1つ足し、上限以内なら true、超えたら false を返す
-- ---------------------------------------------------------------------------

create or replace function public.check_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_max integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  -- anon が公開キーで直接呼べるので、でたらめなキーで大きな行を増やせないよう、形を限る
  if p_key is null or p_key !~ '^(review|submission|plan):[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'p_key は <review|submission|plan>:<16進64文字> にしてください';
  end if;
  if p_window_seconds is null or p_window_seconds not between 1 and 86400 then
    raise exception using errcode = '22023', message = 'p_window_seconds は1〜86400にしてください';
  end if;
  if p_max is null or p_max < 0 then
    raise exception using errcode = '22023', message = 'p_max は0以上にしてください';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start) do update set count = rl.count + 1
  returning rl.count into v_count;

  -- 古い枠の行はもう使わないので、ときどき（約100回に1回）まとめて消す
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_count <= p_max;
end;
$$;

-- ---------------------------------------------------------------------------
-- 関数の実行権限
-- Postgres は関数の execute を public に、Supabase は anon・authenticated に既定で付けるので外す
-- ---------------------------------------------------------------------------

revoke execute on function public.normalize_for_moderation(text) from public, anon, authenticated;
revoke execute on function public.assert_visible_text(text, boolean) from public, anon, authenticated;
revoke execute on function public.assert_postable_text(text) from public, anon, authenticated;
revoke execute on function public.reviews_before_insert() from public, anon, authenticated;
revoke execute on function public.geojson_contains_point(jsonb, double precision, double precision)
  from public, anon, authenticated;
revoke execute on function public.submit_spot(uuid, text, text, text, double precision, double precision, text, text)
  from public, anon, authenticated;
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;

grant execute on function public.check_rate_limit(text, integer, integer) to anon;
grant execute on function public.submit_spot(uuid, text, text, text, double precision, double precision, text, text)
  to anon;
