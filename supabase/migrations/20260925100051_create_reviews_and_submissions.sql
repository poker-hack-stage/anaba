-- 口コミ・スポットの投稿（ログインなしの匿名）の DB 側（docs/spec.md 画面-4、#51）
--   reviews           : スポットの口コミ。書いたらすぐ公開し、管理者があとから hidden にできる
--   spot_submissions  : 「穴場を教える」の投稿。管理者が承認すると spots に入る
--   published_reviews : 公開してよい口コミの、公開してよい列だけのビュー
--   rate_limits       : IP ごとのレート制限の回数（check_rate_limit() が使う。#52・#25）
--   ng_words          : NG ワード。管理者があとから足す（#55）
--   spots.source      : seed / user（投稿を承認して入れたもの）
--
-- 書き込むのは anon ロール（ログインがないため）。公開キーはブラウザに出ているので、
-- API（#52）を通らない直接の insert でも荒らしを止められるよう、権限とトリガーで守る。
--
-- トリガーが返すエラー（#52 が HTTP のステータスに変える）
--   AN001 : NG ワードを含む（400。どの語に当たったかは返さない）
--   AN002 : URL を含む（400）
--   AN003 : 同じ本文の連投（429）
--   AN004 : 全体の上限を超えた（429）
--   ほかに check 制約違反は 23514（400）、指定できない列を指定したときは 42501

-- ---------------------------------------------------------------------------
-- spots.source
-- ---------------------------------------------------------------------------

alter table public.spots
  add column source text not null default 'seed'
  check (source in ('seed', 'user'));

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

create table public.spot_submissions (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas (id) on delete cascade,
  name text not null check (char_length(btrim(name)) >= 1 and char_length(name) <= 40),
  -- spots.category と同じ6種（lib/spots/categories.ts の CATEGORIES のキー）
  category text not null check (
    category in ('gourmet', 'nature', 'view', 'onsen', 'craft', 'history')
  ),
  description text not null check (
    char_length(btrim(description)) >= 1 and char_length(description) <= 300
  ),
  -- 日本のおおよその範囲（沖ノ鳥島〜択捉島、与那国島〜南鳥島）
  lat double precision not null check (lat between 20 and 46),
  lng double precision not null check (lng between 122 and 154),
  nickname text not null check (char_length(btrim(nickname)) >= 1 and char_length(nickname) <= 20),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  client_hash text check (char_length(client_hash) <= 128),
  created_at timestamptz not null default now()
);

create index spot_submissions_created_at_idx on public.spot_submissions (created_at);
create index spot_submissions_status_idx on public.spot_submissions (status);

create table public.rate_limits (
  -- IP のハッシュ＋種類（例: 'review:<client_hash>'）。作り方は呼ぶ側（#52・#25）が決める
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
alter table public.spot_submissions enable row level security;
alter table public.rate_limits enable row level security;
alter table public.ng_words enable row level security;

revoke all on table public.reviews from anon, authenticated;
revoke all on table public.spot_submissions from anon, authenticated;
revoke all on table public.rate_limits from anon, authenticated;
revoke all on table public.ng_words from anon, authenticated;

-- anon は列を限った insert だけ。status・id・created_at は指定できない（既定値が入る）
grant insert (spot_id, nickname, rating, body, client_hash) on table public.reviews to anon;
grant insert (area_id, name, category, description, lat, lng, nickname, client_hash)
  on table public.spot_submissions to anon;

-- select・update・delete のポリシーは作らない（anon は読めない・変えられない）
-- status の条件は列の権限と二重の守り
create policy "reviews: anon は公開の状態でだけ投稿可"
  on public.reviews for insert
  to anon
  with check (status = 'published');

create policy "spot_submissions: anon は承認待ちでだけ投稿可"
  on public.spot_submissions for insert
  to anon
  with check (status = 'pending');

-- rate_limits・ng_words にはポリシーを作らない（anon・authenticated から見えない）

-- ---------------------------------------------------------------------------
-- 公開用のビュー
-- anon は reviews を読めないので、所有者の権限で読むビュー（security_invoker にしない）にして、
-- 公開してよい行と列だけを出す
-- ---------------------------------------------------------------------------

create view public.published_reviews as
  select id, spot_id, nickname, rating, body, created_at
  from public.reviews
  where status = 'published';

revoke all on table public.published_reviews from anon, authenticated;
grant select on table public.published_reviews to anon;

-- ---------------------------------------------------------------------------
-- 荒らし対策のトリガー
-- anon は ng_words・reviews を読めないので security definer にする
-- ---------------------------------------------------------------------------

-- 比べる前に NFKC で正規化して小文字にする（全角の「ｈｔｔｐ」やカタカナの半角ですり抜けさせない）
create or replace function public.normalize_for_moderation(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(normalize(coalesce(p_text, ''), NFKC));
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
    where strpos(v_text, public.normalize_for_moderation(w.word)) > 0
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
  perform public.assert_postable_text(new.nickname || ' ' || new.body);

  -- 数えている間にほかの insert が入って上限を超えないよう、口コミの insert を直列にする
  perform pg_advisory_xact_lock(hashtext('public.reviews_before_insert'));

  if exists (
    select 1
    from public.reviews r
    where r.spot_id = new.spot_id
      and r.body = new.body
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

create or replace function public.spot_submissions_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_postable_text(new.nickname || ' ' || new.name || ' ' || new.description);

  perform pg_advisory_xact_lock(hashtext('public.spot_submissions_before_insert'));

  if (
    select count(*)
    from public.spot_submissions s
    where s.created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception using errcode = 'AN004', message = '投稿が混み合っています。しばらくしてからお試しください';
  end if;

  return new;
end;
$$;

create trigger spot_submissions_before_insert
  before insert on public.spot_submissions
  for each row execute function public.spot_submissions_before_insert();

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
  if p_key is null or char_length(p_key) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'p_key は1〜200文字にしてください';
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
-- 投稿の承認（管理者が SQL Editor から呼ぶ。#55）
-- 承認待ちの投稿を source = 'user' で spots に入れ、投稿を approved にする。新しい spots.id を返す
-- ---------------------------------------------------------------------------

create or replace function public.approve_spot_submission(p_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_submission public.spot_submissions%rowtype;
  v_spot_id uuid;
begin
  select * into v_submission
  from public.spot_submissions
  where id = p_id
  for update;

  if not found then
    raise exception 'spot_submissions に id = % の行がありません', p_id;
  end if;
  if v_submission.status <> 'pending' then
    raise exception 'id = % は承認待ちではありません（status = %）', p_id, v_submission.status;
  end if;

  insert into public.spots (area_id, name, category, lat, lng, description, source)
  values (
    v_submission.area_id,
    v_submission.name,
    v_submission.category,
    v_submission.lat,
    v_submission.lng,
    v_submission.description,
    'user'
  )
  returning id into v_spot_id;

  update public.spot_submissions set status = 'approved' where id = p_id;

  return v_spot_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 関数の実行権限
-- Postgres は関数の execute を public に、Supabase は anon・authenticated に既定で付けるので外す
-- ---------------------------------------------------------------------------

revoke execute on function public.normalize_for_moderation(text) from public, anon, authenticated;
revoke execute on function public.assert_postable_text(text) from public, anon, authenticated;
revoke execute on function public.reviews_before_insert() from public, anon, authenticated;
revoke execute on function public.spot_submissions_before_insert() from public, anon, authenticated;
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.approve_spot_submission(uuid) from public, anon, authenticated;

grant execute on function public.check_rate_limit(text, integer, integer) to anon;
