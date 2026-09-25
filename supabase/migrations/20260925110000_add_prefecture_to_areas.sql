-- 地域（areas）に都道府県の列を足す（#11、docs/spec.md データ-1）
-- 絞り込みフォームの都道府県ごとの select（#17）・検索（#49）・投稿フォーム（#54）で使う。
-- 値は「長野県」「北海道」のように都道府県名をそのまま入れる。
-- not null で既定値がないので、空のテーブルにしか当たらない（ローカルは db:reset でシードより先に流れるので空のまま通る）。
-- 本番（#35）も areas に行がない前提。行がある DB に当てる場合は、このファイルを
-- 「add column prefecture text → update で値を入れる → alter column prefecture set not null」の3段に書き換えてから適用する。

alter table public.areas
  add column prefecture text not null;
