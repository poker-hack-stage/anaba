import { BedDouble, Clock, Lightbulb, MapPin } from "lucide-react";
import { SpotMap } from "@/components/map/spot-map";
import type { Spot } from "@/lib/data/spots";
import { formatMinutes } from "@/lib/planner/duration";
import type { PlanCandidate, PlanDay } from "@/lib/planner/types";
import { cn } from "@/lib/utils";
import { getDayColor } from "./day-colors";

/**
 * 旅プランの候補カード。地図と、日ごとの経路・所要時間・選ばれた理由を出す（docs/spec.md の 6.2・#57）
 * TODO(#57): 地図で日ごとに線とマーカーの色を変え、凡例を出す（Leaflet の地図、PR #41 のあと）。今は全日の経路を1本で出している
 */
export function CandidateCard({
  candidate,
  index,
  onSpotClick,
}: {
  candidate: PlanCandidate;
  index: number;
  onSpotClick: (spot: Spot) => void;
}) {
  const multiDay = candidate.days.length > 1;
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <SpotMap
        route={candidate.days.flatMap((day) => day.route)}
        others={candidate.otherSpots}
        onSpotClick={onSpotClick}
        className="h-56 rounded-none border-0 border-b"
      />
      <div className="flex flex-col gap-4 p-4">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-shu">
            候補 {index + 1}
            {candidate.nearby && (
              <span className="rounded-full border border-ink/20 bg-ink-light px-2 py-0.5 text-[11px] font-bold text-ink">
                近くの地域
              </span>
            )}
          </p>
          <h3 className="mt-0.5 font-extrabold leading-snug text-stone-900">
            {candidate.title}
          </h3>
          {candidate.summary && (
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              {candidate.summary}
            </p>
          )}
        </div>

        {candidate.reason && (
          <div className="flex gap-2 rounded-xl bg-washi px-3 py-2.5 text-sm leading-relaxed text-stone-700">
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
