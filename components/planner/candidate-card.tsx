"use client";

import dynamic from "next/dynamic";
import { BedDouble, Clock, Lightbulb, MapPin } from "lucide-react";
import { SpotMapSkeleton } from "@/components/map/spot-map-skeleton";
import type { Spot } from "@/lib/data/spots";
import { formatMinutes } from "@/lib/planner/duration";
import type { PlanCandidate, PlanDay } from "@/lib/planner/types";
import { cn } from "@/lib/utils";
import { getDayColor } from "./day-colors";

const MAP_CLASS_NAME = "h-56 rounded-none border-0 border-b";

// 地図（MapLibre）は window と WebGL を使うので、サーバーでは描画しない
const SpotMap = dynamic(
  () => import("@/components/map/spot-map").then((m) => m.SpotMap),
  { ssr: false, loading: () => <SpotMapSkeleton className={MAP_CLASS_NAME} /> },
);

/**
 * 旅プランの候補カード。地図と、日ごとの経路・所要時間・選ばれた理由を出す（docs/spec.md の 6.2・#57）。
 * 何件目の候補かは、包むタブ（candidate-tabs.tsx）に出す。
 * 複数日の候補は、地図の線・ピンと日の見出しを日ごとの色（day-colors.ts）でそろえ、地図に凡例を出す
 */
export function CandidateCard({
  candidate,
  onSpotClick,
}: {
  candidate: PlanCandidate;
  onSpotClick: (spot: Spot) => void;
}) {
  const multiDay = candidate.days.length > 1;
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <SpotMap
        routes={candidate.days.map((day) =>
          // 日帰りは今までどおり1本の朱の経路にし、凡例も出さない
          multiDay
            ? {
                spots: day.route,
                color: getDayColor(day.day).hex,
                name: `${day.day}日目`,
              }
            : { spots: day.route },
        )}
        others={candidate.otherSpots}
        onSpotClick={onSpotClick}
        className={MAP_CLASS_NAME}
      />
      <div className="flex flex-col gap-4 p-4">
        <div>
          {candidate.nearby && (
            <p className="mb-1">
              <span className="rounded-full border border-ink/20 bg-ink-light px-2 py-0.5 text-[11px] font-bold text-ink">
                近くの地域
              </span>
            </p>
          )}
          <h3 className="font-extrabold leading-snug text-stone-900">
            {candidate.title}
          </h3>
          {candidate.summary && (
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              {candidate.summary}
            </p>
          )}
        </div>

        {candidate.reason && (
          <div className="bg-washi flex gap-2 rounded-xl px-3 py-2.5 text-sm leading-relaxed text-stone-700">
            <Lightbulb
              className="mt-0.5 h-4 w-4 shrink-0 text-shu"
              aria-hidden
            />
            <p>
              <span className="sr-only">選ばれた理由: </span>
              {candidate.reason}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {candidate.days.map((day) => (
            <DayRoute
              key={day.day}
              day={day}
              multiDay={multiDay}
              onSpotClick={onSpotClick}
            />
          ))}
        </div>

        {(multiDay || candidate.otherSpots.length > 0) && (
          <div className="flex flex-col gap-1 text-[11px] text-stone-500">
            {multiDay && (
              <p className="flex items-center gap-1">
                <BedDouble className="h-3 w-3" aria-hidden />
                宿は含みません。
              </p>
            )}
            {candidate.otherSpots.length > 0 && (
              <p>
                地図の小さなピンは経路外のスポットです。タップで詳細を見られます。
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/** 1日ぶんの経路。見出し（何日目・地域・所要時間）の下に、めぐる順の番号付きのリスト */
function DayRoute({
  day,
  multiDay,
  onSpotClick,
}: {
  day: PlanDay;
  multiDay: boolean;
  onSpotClick: (spot: Spot) => void;
}) {
  const color = getDayColor(day.day);
  return (
    <section>
      <h4
        className={cn(
          "mb-2 flex flex-wrap items-center gap-x-1.5 text-xs font-bold",
          multiDay ? color.text : "text-stone-600",
        )}
      >
        {multiDay && (
          <>
            <span>{day.day}日目</span>
            <span aria-hidden>・</span>
          </>
        )}
        <span className="inline-flex items-center gap-0.5">
          <MapPin className="h-3 w-3" aria-hidden />
          {day.areaName}
        </span>
        <span aria-hidden>・</span>
        <span className="inline-flex items-center gap-0.5">
          <Clock className="h-3 w-3" aria-hidden />
          <span className="sr-only">所要時間の目安</span>
          {formatMinutes(day.durationMinutes)}
        </span>
      </h4>
      <ol
        className={cn(
          "relative ml-3 space-y-2 border-l-2 border-dashed",
          color.border,
        )}
      >
        {day.route.map((spot, i) => (
          <li key={spot.id} className="ml-4 flex items-baseline gap-2">
            <span
              className={cn(
                "absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white",
                color.dot,
              )}
            >
              {i + 1}
            </span>
            <button
              type="button"
              onClick={() => onSpotClick(spot)}
              className="text-left text-sm font-bold text-stone-800 hover:text-shu"
            >
              {spot.name}
            </button>
            {spot.stay_minutes !== null && (
              <span className="shrink-0 text-[11px] text-stone-500">
                <span className="sr-only">滞在の目安 </span>
                {formatMinutes(spot.stay_minutes)}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
