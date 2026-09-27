-- 「穴場を教える」を全国に広げる（47都道府県・市区町村の入力・どこでもピン）
--   spot_candidates         : anaba の地域（areas）の外に置かれた投稿。「公開待ちの候補」として非公開で持つ
--   submit_spot_anywhere()  : 投稿の入口。ピンが地域の中なら submit_spot() と同じくすぐ公開し、外なら候補にする
--   publish_spot_candidates(): 地域を足したあとに管理者が呼ぶ。新しい地域の中に入った候補を spots に移して公開する
--
-- submit_spot()（地域を指定する投稿）は、古い画面・API が残っている間も動くよう、そのまま残す。
-- エラーは submit_spot() と同じ（AN001〜AN004・23514・22023）。22023 は場所が日本の範囲の外のときだけ

-- ---------------------------------------------------------------------------
-- 公開待ちの候補
-- ---------------------------------------------------------------------------

create table public.spot_candidates (
  id uuid primary key default gen_random_uuid(),
  -- 47都道府県（lib/geo/prefectures.ts と同じ）
  prefecture text not null check (prefecture in (
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
    '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
    '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
  )),
  -- 投稿した人が選んだ市区町村（lib/geo/municipalities.json の名前。API が確かめる）
  municipality text not null check (char_length(btrim(municipality)) >= 1 and char_length(municipality) <= 20),
  name text not null check (char_length(btrim(name)) >= 1 and char_length(name) <= 40),
  -- spots.category と同じ6種
  category text not null check (category in ('gourmet', 'nature', 'view', 'onsen', 'craft', 'history')),
  description text not null check (char_length(btrim(description)) >= 1 and char_length(description) <= 300),
  lat double precision not null check (lat between 20 and 46),
  lng double precision not null check (lng between 122 and 154),
  nickname text not null check (char_length(btrim(nickname)) >= 1 and char_length(nickname) <= 20),
  -- IP と RATE_LIMIT_SALT から作る SHA-256。公開しない
  client_hash text check (client_hash ~ '^[0-9a-f]{64}$'),
  -- pending: 公開待ち / published: spots に移して公開した / rejected: 管理者が公開しないと決めた
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  -- 公開したときの spots の行
  spot_id uuid references public.spots (id) on delete set null,
  created_at timestamptz not null default now()
);

-- 全体の上限の判定と、管理者が新しい順に見るときに使う
create index spot_candidates_created_at_idx on public.spot_candidates (created_at);
-- 連投・1市区町村の上限の判定と、地域を足すときに町ごとの候補を見るのに使う
create index spot_candidates_place_idx on public.spot_candidates (prefecture, municipality, created_at);
-- 管理者が同じ client_hash をまとめて rejected にするときに使う
create index spot_candidates_client_hash_idx on public.spot_candidates (client_hash);

-- anon・authenticated からは読めず、書けない（書くのは submit_spot_anywhere() だけ）
alter table public.spot_candidates enable row level security;
revoke all on table public.spot_candidates from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 点が入る地域。境界があればその内側、なければ中心から 50 km 以内（submit_spot() と同じ判定）。
-- 2つ以上に入るときは display_order の早いほう。どこにも入らなければ null
-- ---------------------------------------------------------------------------

create or replace function public.find_area_for_point(p_lat double precision, p_lng double precision)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.id
  from public.areas a
  where coalesce(
    public.geojson_contains_point(a.boundary, p_lat, p_lng),
    6371 * 2 * asin(sqrt(
      power(sin(radians(p_lat - a.center_lat) / 2), 2)
      + cos(radians(a.center_lat)) * cos(radians(p_lat))
        * power(sin(radians(p_lng - a.center_lng) / 2), 2)
    )) <= 50
  )
  order by a.display_order, a.id
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 投稿の入口（POST /api/spot-submissions が rpc で呼ぶ）
-- 返す値: { "status": "published", "id": spots の id, "area_id": 地域の id }
--       か { "status": "pending", "id": spot_candidates の id }
-- ---------------------------------------------------------------------------

create or replace function public.submit_spot_anywhere(
  p_prefecture text,
  p_municipality text,
  p_name text,
  p_category text,
  p_description text,
  p_lat double precision,
  p_lng double precision,
  p_nickname text,
  p_client_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_area_id uuid;
  v_id uuid;
begin
  -- 日本のおおよその範囲（submit_spot() と同じ）。NaN・Infinity もここで弾かれる
  if p_lat is null or p_lng is null
    or not (p_lat between 20 and 46 and p_lng between 122 and 154) then
    raise exception using errcode = '22023', message = '場所が日本の範囲の外です';
  end if;

  if p_municipality is null or char_length(p_municipality) > 20 then
    raise exception using errcode = 'check_violation', message = '市区町村は1〜20文字にしてください';
  end if;
  perform public.assert_visible_text(p_municipality, false);
  perform public.assert_no_bidi_control(p_municipality);

  -- 地域の中なら、これまでどおり submit_spot() が検査して spots に入れ、すぐ公開する
  v_area_id := public.find_area_for_point(p_lat, p_lng);
  if v_area_id is not null then
    v_id := public.submit_spot(
      v_area_id, p_name, p_category, p_description, p_lat, p_lng, p_nickname, p_client_hash
    );
    return jsonb_build_object('status', 'published', 'id', v_id, 'area_id', v_area_id);
  end if;

  -- 地域の外: submit_spot() と同じ検査をして、公開待ちの候補にする
  if p_nickname is null or char_length(p_nickname) > 20 then
    raise exception using errcode = 'check_violation', message = 'ニックネームは1〜20文字にしてください';
  end if;
  if p_name is null or char_length(p_name) > 40 then
    raise exception using errcode = 'check_violation', message = 'スポット名は1〜40文字にしてください';
  end if;
  if p_description is null or char_length(p_description) > 300 then
    raise exception using errcode = 'check_violation', message = 'ひとことは1〜300文字にしてください';
  end if;
  if p_category is null
    or p_category not in ('gourmet', 'nature', 'view', 'onsen', 'craft', 'history') then
    raise exception using errcode = 'check_violation', message = 'カテゴリが正しくありません';
  end if;

  perform public.assert_visible_text(p_nickname, false);
  perform public.assert_visible_text(p_name, false);
  perform public.assert_visible_text(p_description, true);
  perform public.assert_no_bidi_control(p_nickname || p_name || p_description);
  perform public.assert_postable_text(
    p_nickname || ' ' || p_municipality || ' ' || p_name || ' ' || p_description
  );

  if p_client_hash is not null and p_client_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'p_client_hash は16進64文字にしてください';
  end if;

  -- 数えている間にほかの投稿が入って上限を超えないよう、submit_spot() と同じ鍵で投稿を直列にする
  perform pg_advisory_xact_lock(hashtext('public.submit_spot'));

  -- 連投: 同じ市区町村に、正規化して同じ名前の候補が24時間以内にあれば拒否する
  if exists (
    select 1
    from public.spot_candidates c
    where c.prefecture = p_prefecture
      and c.municipality = p_municipality
      and c.created_at > now() - interval '24 hours'
      and public.normalize_for_moderation(c.name) = public.normalize_for_moderation(p_name)
  ) then
    raise exception using errcode = 'AN003', message = '同じスポットがすでに投稿されています';
  end if;

  -- 1市区町村の上限
  if (
    select count(*)
    from public.spot_candidates c
    where c.prefecture = p_prefecture
      and c.municipality = p_municipality
      and c.created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception using errcode = 'AN004', message = '投稿が混み合っています。しばらくしてからお試しください';
  end if;

  -- 全体の上限（候補だけで数える。すぐ公開する投稿の上限は submit_spot() が別に見る）
  if (
    select count(*)
    from public.spot_candidates c
    where c.created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception using errcode = 'AN004', message = '投稿が混み合っています。しばらくしてからお試しください';
  end if;

  -- 都道府県が47のどれでもなければ、check 制約で 23514 になる
  insert into public.spot_candidates (
    prefecture, municipality, name, category, description, lat, lng, nickname, client_hash
  )
  values (
    p_prefecture, p_municipality, p_name, p_category, p_description, p_lat, p_lng, p_nickname, p_client_hash
  )
  returning id into v_id;

  return jsonb_build_object('status', 'pending', 'id', v_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 公開待ちの候補の公開（管理者が SQL Editor で呼ぶ。anon・authenticated は呼べない）
-- 地域（areas）を足したあとに select public.publish_spot_candidates(); を実行すると、
-- どこかの地域の中に入った pending の候補を spots に source = 'user' で入れ、候補を published にする。
-- 公開した件数を返す
-- ---------------------------------------------------------------------------

create or replace function public.publish_spot_candidates()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate public.spot_candidates%rowtype;
  v_area_id uuid;
  v_spot_id uuid;
  v_count integer := 0;
begin
  for v_candidate in
    select * from public.spot_candidates c where c.status = 'pending' order by c.created_at
    for update
  loop
    v_area_id := public.find_area_for_point(v_candidate.lat, v_candidate.lng);
    continue when v_area_id is null;

    insert into public.spots (area_id, name, category, lat, lng, description, source, status, nickname)
    values (
      v_area_id, v_candidate.name, v_candidate.category, v_candidate.lat, v_candidate.lng,
      v_candidate.description, 'user', 'published', v_candidate.nickname
    )
    returning id into v_spot_id;

    if v_candidate.client_hash is not null then
      insert into public.spot_client_hashes (spot_id, client_hash)
      values (v_spot_id, v_candidate.client_hash);
    end if;

    update public.spot_candidates
      set status = 'published', spot_id = v_spot_id
      where id = v_candidate.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 関数の実行権限（Postgres・Supabase が既定で付けるものを外し、入口だけ anon に付ける）
-- ---------------------------------------------------------------------------

revoke execute on function public.find_area_for_point(double precision, double precision)
  from public, anon, authenticated;
revoke execute on function public.submit_spot_anywhere(
  text, text, text, text, text, double precision, double precision, text, text
) from public, anon, authenticated;
revoke execute on function public.publish_spot_candidates() from public, anon, authenticated;

grant execute on function public.submit_spot_anywhere(
  text, text, text, text, text, double precision, double precision, text, text
) to anon;
