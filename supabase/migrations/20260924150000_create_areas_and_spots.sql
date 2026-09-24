-- めぐりまちの基本テーブル（docs/issues.md #9 の案をもとにした最小構成）
--   areas : 地域（トップページで順番にハイライトする単位）
--   spots : 地域の中の穴場スポット
-- 誰でも読めるが、アプリからは書き込めない（データは seed / Studio / マイグレーションで入れる）

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  catchphrase text,
  center_lat double precision not null,
  center_lng double precision not null,
  zoom smallint not null default 12,
  -- 地域の境界（GeoJSON）。PostGIS を使うことになったら geometry 型に変える
  boundary jsonb,
  image_path text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.spots (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas (id) on delete cascade,
  name text not null,
  -- lib/spots/categories.ts の CATEGORIES のキーと合わせる
  category text not null check (
    category in ('gourmet', 'nature', 'view', 'onsen', 'craft', 'history')
  ),
  lat double precision not null,
  lng double precision not null,
  catchphrase text,
  description text,
  local_tip text,
  best_time text,
  stay_minutes integer,
  tags text[] not null default '{}',
  rating numeric(2, 1) check (rating between 0 and 5),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index spots_area_id_idx on public.spots (area_id);

alter table public.areas enable row level security;
alter table public.spots enable row level security;

create policy "areas: 誰でも閲覧可"
  on public.areas for select
  to anon, authenticated
  using (true);

create policy "spots: 誰でも閲覧可"
  on public.spots for select
  to anon, authenticated
  using (true);

create trigger areas_set_updated_at
  before update on public.areas
  for each row execute function public.set_updated_at();

create trigger spots_set_updated_at
  before update on public.spots
  for each row execute function public.set_updated_at();
