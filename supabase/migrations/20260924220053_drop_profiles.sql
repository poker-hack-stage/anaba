-- ログイン機能を外したので profiles を消す（#37。#3 の決定で投稿・口コミはログインなしの匿名になった）
-- 20260924142340_create_profiles.sql は書き換えず、このマイグレーションで打ち消す。
-- public.set_updated_at() は areas・spots のトリガーが使っているので残す。

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- profiles_set_updated_at トリガーとポリシーはテーブルと一緒に消える
drop table if exists public.profiles;
