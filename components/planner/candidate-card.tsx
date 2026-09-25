"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { SpotMapSkeleton } from "@/components/map/spot-map-skeleton";
import type { Spot } from "@/lib/data/spots";
import type { PlanCandidate } from "@/lib/planner/types";

const MAP_CLASS_NAME = "h-56 rounded-none border-0 border-b";

// 地図（MapLibre）は window と WebGL を使うので、サーバーでは描画しない
const SpotMap = dynamic(
  () => import("@/components/map/spot-map").then((m) => m.SpotMap),
  { ssr: false, loading: () => <SpotMapSkeleton className={MAP_CLASS_NAME} /> },
);

/** 旅プランの候補カード。地図に経路と、経路以外のスポットを表示する（何件目の候補かは、包むタブ（candidate-tabs.tsx）に出す） */
// TODO(#57): 日ごとの見出し（「1日目 ・ 地域名 ・ 約4時間」）・選ばれた理由・「近くの地域」を出す。今は全日の経路をつなげて出している
export function CandidateCard({
  candidate,
  onSpotClick,
}: {
  candidate: PlanCandidate;
  onSpotClick: (spot: Spot) => void;
}) {
  const route = candidate.days.flatMap((day) => day.route);
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <SpotMap
        route={route}
        others={candidate.otherSpots}
        onSpotClick={onSpotClick}
        className={MAP_CLASS_NAME}
      />
      <div className="flex flex-col gap-3 p-4">
        <div>
          <h3 className="font-extrabold leading-snug text-stone-900">
            {candidate.title}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
            <MapPin className="h-3 w-3" />
            {candidate.areaName}
          </p>
          {candidate.summary && (
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              {candidate.summary}
            </p>
          )}
        </div>

        {/* おすすめの経路（めぐる順） */}
        <ol className="relative ml-3 space-y-2 border-l-2 border-dashed border-shu-border">
          {route.map((spot, i) => (
            <li key={spot.id} className="ml-4">
              <span className="absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full bg-shu text-[10px] font-bold text-white">
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => onSpotClick(spot)}
                className="text-left text-sm font-bold text-stone-800 hover:text-shu"
              >
                {spot.name}
              </button>
            </li>
          ))}
        </ol>

        {candidate.otherSpots.length > 0 && (
          <p className="text-[11px] text-stone-500">
            地図の小さなピンは経路外のスポットです。タップで詳細を見られます。
          </p>
        )}
      </div>
    </article>
  );
}
