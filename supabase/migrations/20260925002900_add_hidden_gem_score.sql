-- スポットの穴場度（#29、docs/spec.md データ-3）
--   1〜5 の整数。値がないスポットは null
--   値の付け方は docs/spot-scores.md。アプリでは lib/spots/score.ts を通して読む

alter table public.spots
  add column hidden_gem_score smallint
    constraint spots_hidden_gem_score_check
    check (hidden_gem_score between 1 and 5);

comment on column public.spots.hidden_gem_score is
  '穴場度（1〜5 の整数、null 可）。基準は docs/spot-scores.md';
