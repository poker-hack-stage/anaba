import type { PlanDuration } from "./types";

// 「絞る」のフォームの選択肢（docs/spec.md の画面-1）。フォームと、API の入力の検証（schema.ts）で共有する

/** 「おまかせ」（地域を指定しない）の表示 */
export const ANY_AREA_LABEL = "おまかせ";

/** 日程。表示の文言は duration.ts の DURATION_LABELS */
export const DURATIONS = [
  "day",
  "1n2d",
  "2n3d",
] as const satisfies readonly PlanDuration[];

/** 興味のあること（複数選べる）。カテゴリ6種と1対1（generate.ts の INTEREST_TO_CATEGORY） */
export const INTERESTS = [
  "食",
  "自然",
  "絶景",
  "温泉",
  "体験",
  "歴史",
] as const;

export const COMPANIONS = [
  "ひとり",
  "友人",
  "カップル",
  "家族（子連れ）",
] as const;

/** 移動手段。移動の目安は duration.ts の MOVE_MINUTES */
export const TRANSPORTS = ["車", "電車・バス", "自転車"] as const;
