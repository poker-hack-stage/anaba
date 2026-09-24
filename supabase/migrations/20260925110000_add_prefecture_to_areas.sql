-- 地域（areas）に都道府県の列を足す（#11、docs/spec.md データ-1）
-- 絞り込みフォームの都道府県ごとの select（#17）・検索（#49）・投稿フォーム（#54）で使う。
-- 値は「長野県」「北海道」のように都道府県名をそのまま入れる。
-- not null にするので、既に行がある DB では先に値を入れてから適用すること（ローカルは db:reset でシードより先に流れるので空のまま通る）。

alter table public.areas
  add column prefecture text not null;
