-- ユーザープロフィール（auth.users と 1:1）
-- サンプル兼ひな形。テーブルを追加するときは `npm run db:new <name>` で新しいマイグレーションを作ること。

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS は必ず有効化する（無効のままだと anon キーで誰でも読み書きできてしまう）
alter table public.profiles enable row level security;

create policy "profiles: 認証済みユーザーは全員閲覧可"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: 本人のみ更新可"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- updated_at 自動更新（他のテーブルでも使い回せる）
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- サインアップ時に profiles を自動作成
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
