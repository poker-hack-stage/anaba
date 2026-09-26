import type { PlanCandidate, PlanConditions, PlanResponse } from "./types";

// AI旅プランのプランを取っておく形。「前のプランに戻る」の履歴（#149）で使い、ブックマーク（#150）でも同じ形で保存する。
// AI は毎回結果が変わるので、条件だけでなく出た候補（経路のスポットの並びも）をそのまま持つ

/** 取っておいたプラン1つぶん */
export type PlanSnapshot = {
  /** 候補を出したときの条件（作り直し〈#32〉なら includeSpotId も入る） */
  conditions: PlanConditions;
  candidates: PlanCandidate[];
  /** 候補の作り方（Gemini か、デモモードか） */
  mode: PlanResponse["mode"];
  /** 429（#25）でブラウザのデモモードで作ったとき true */
  rateLimited: boolean;
  /** 選んでいた候補の番号（0 始まり） */
  selectedIndex: number;
};

/** 候補の経路のスポットの id を、日ごとにめぐる順で並べる（1日目が先頭） */
export function routeSpotIds(candidate: PlanCandidate): string[][] {
  return candidate.days.map((day) => day.route.map((spot) => spot.id));
}
