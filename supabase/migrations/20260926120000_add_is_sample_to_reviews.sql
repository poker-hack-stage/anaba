-- サンプルの口コミ（#152）
--   reviews.is_sample : 表示を確かめるために運営が seed.sql で入れた、サンプルの口コミなら true。
--                       画面では「サンプル」と分かるように出し、訪れた人の口コミと誤解させない
--
-- anon の insert は列を指定した権限（spot_id・nickname・rating・body・client_hash）なので、
-- 利用者が is_sample を付けて書くことはできない（付けると 42501）。既定値の false で入る

alter table public.reviews
  add column is_sample boolean not null default false;

-- 公開してよい列に is_sample を足す。create or replace view は列を末尾に足すことだけできる。
-- 権限（anon・authenticated の select）はそのまま残る
create or replace view public.published_reviews with (security_barrier = true) as
  select r.id, r.spot_id, r.nickname, r.rating, r.body, r.created_at, r.is_sample
  from public.reviews r
  where r.status = 'published'
    and exists (select 1 from public.spots s where s.id = r.spot_id and s.status = 'published');
