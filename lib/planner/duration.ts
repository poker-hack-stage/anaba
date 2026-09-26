import type { Spot } from "@/lib/data/spots";
import type { PlanDuration } from "./types";

// 日程と、1日の所要時間の目安（docs/spec.md の画面-2・データ-4）

/** 日程ごとの日数 */
export const DAY_COUNTS: Record<PlanDuration, number> = {
  day: 1,
  "1n2d": 2,
  "2n3d": 3,
};

/** 日程の表示の文言 */
export const DURATION_LABELS: Record<PlanDuration, string> = {
  day: "日帰り",
  "1n2d": "1泊2日",
  "2n3d": "2泊3日",
};

/** スポット間の移動の目安（分）。本数の少ない路線バスや坂道を考えて、車より長めに取る */
export const MOVE_MINUTES: Record<string, number> = {
  車: 20,
  "電車・バス": 40,
  自転車: 30,
};

/** 移動手段が分からないときの移動の目安（分）。短く見積もらないよう、いちばん長いものにする */
const UNKNOWN_MOVE_MINUTES = Math.max(...Object.values(MOVE_MINUTES));

/**
 * 1日の所要時間の上限の目安（分）。Gemini に詰め込みすぎの日を作らせないよう、プロンプトで伝える（#113）。
 * サーバーでは切らない（デモモードの経路は最大4件で、この目安に収まる）
 */
export const MAX_DAY_MINUTES = 480;

/** 移動手段ごとのスポット間の移動の目安（分）。知らない移動手段なら、いちばん長いもの */
export function getMoveMinutes(transport: string): number {
  return MOVE_MINUTES[transport] ?? UNKNOWN_MOVE_MINUTES;
}

/** stay_minutes がないスポットの滞在の目安（分） */
export const DEFAULT_STAY_MINUTES = 60;

/**
 * 1日の所要時間の目安（分）。
 * 各スポットの滞在（stay_minutes。null は60分）の合計 ＋ 移動の目安 ×（スポット数 − 1）
 */
export function calcDayMinutes(
  route: readonly Pick<Spot, "stay_minutes">[],
  transport: string,
): number {
  if (route.length === 0) return 0;
  const stay = route.reduce(
    (sum, spot) => sum + (spot.stay_minutes ?? DEFAULT_STAY_MINUTES),
    0,
  );
  return stay + getMoveMinutes(transport) * (route.length - 1);
}

/**
 * 時間の目安を「約4時間」「約4時間半」「約45分」のように表す（docs/spec.md の 6.2）。
 * 目安なので、1時間以上は30分単位に丸める
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `約${Math.max(0, Math.round(minutes))}分`;
  const halfHours = Math.round(minutes / 30);
  const hours = Math.floor(halfHours / 2);
  return `約${hours}時間${halfHours % 2 === 1 ? "半" : ""}`;
}
