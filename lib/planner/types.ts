import type { Spot } from "@/lib/data/spots";

// AI旅プランの画面と API（app/api/plan/route.ts）で共有する型。形は docs/spec.md のデータ-4

/** 日程 */
export type PlanDuration = "day" | "1n2d" | "2n3d";

/** 「絞る」で送る条件（docs/spec.md のデータ-4） */
export type PlanConditions = {
  /** 地域の id。null なら「おまかせ」 */
  areaId: string | null;
  duration: PlanDuration;
  interests: string[];
  companion: string;
  transport: string;
  /** どの候補にも必ず経路に入れるスポットの id（「このスポットを経路に加えて作り直す」、#32）。URL のクエリには持たない */
  includeSpotId?: string;
};

/** 1日ぶんの経路 */
export type PlanDay = {
  /** 何日目か（1から） */
  day: number;
  areaId: string;
  areaName: string;
  /** めぐる順。2〜4件 */
  route: Spot[];
  /** その日の所要時間の目安（分）。サーバーで計算する（docs/spec.md の画面-2） */
  durationMinutes: number;
};

/** 候補1件（カード1枚ぶん） */
export type PlanCandidate = {
  /** 1日目の地域の id（1地域につき1候補） */
  id: string;
  /** 1日目の地域名 */
  areaName: string;
  title: string;
  summary: string;
  /** 選ばれた理由（1〜2文、docs/spec.md の画面-2） */
  reason: string;
  duration: PlanDuration;
  /** 日帰りは1要素、1泊2日は2要素、2泊3日は3要素 */
  days: PlanDay[];
  /** 候補の地域のスポットのうち、どの日の経路にも入っていないもの（地図に表示し、クリックで詳細） */
  otherSpots: Spot[];
  /** 地域を選んだときの2・3件目（近くの地域）なら true（docs/spec.md のデータ-2） */
  nearby: boolean;
};

export type PlanResponse = {
  candidates: PlanCandidate[];
  /** Gemini を使わずに作ったとき（#19）は "demo" */
  mode: "ai" | "demo";
};
