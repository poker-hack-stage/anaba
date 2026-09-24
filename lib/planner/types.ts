import type { Spot } from "@/lib/data/spots";

// AI旅プランの画面と API（app/api/plan/route.ts）で共有する型

/** 「絞る」で送る条件 */
export type PlanConditions = {
  /** 地域名。"おまかせ" なら指定なし */
  area: string;
  duration: string;
  interests: string[];
  companion: string;
  transport: string;
};

/** 候補1件（カード1枚ぶん） */
export type PlanCandidate = {
  id: string;
  areaName: string;
  title: string;
  summary: string;
  /** おすすめの経路（めぐる順） */
  route: Spot[];
  /** 経路に入っていない地域内のスポット（地図に表示し、クリックで詳細） */
  otherSpots: Spot[];
};

export type PlanResponse = {
  candidates: PlanCandidate[];
};
