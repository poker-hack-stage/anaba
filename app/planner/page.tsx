import type { Metadata } from "next";
import { Suspense } from "react";
import { PlannerForm } from "@/components/planner/planner-form";
import { getAreasWithSpots } from "@/lib/data/areas";

export const metadata: Metadata = {
  title: "AI旅プラン",
};

export default function PlannerPage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-stone-200 bg-washi p-5 sm:p-7">
        <h1 className="font-brand text-xl font-bold leading-snug text-ink sm:text-2xl">
          条件を選ぶだけで、旅の候補を提案します。
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          エリアや興味を選んで「絞る」を押すと、おすすめの地域と経路が地図で見られます。
        </p>
      </section>

      <Suspense
        fallback={
          <div className="h-80 animate-pulse rounded-2xl bg-stone-200/60" />
        }
      >
        <Planner />
      </Suspense>
    </div>
  );
}

async function Planner() {
  const areas = await getAreasWithSpots();
  // /api/plan が失敗したときにブラウザでデモの候補を作れるよう（#19）、スポットも渡す。
  // 境界（boundary）などの大きい列は使わないので渡さない
  return (
    <PlannerForm
      areas={areas.map(
        ({ id, name, catchphrase, center_lat, center_lng, spots }) => ({
          id,
          name,
          catchphrase,
          center_lat,
          center_lng,
          spots,
        }),
      )}
    />
  );
}
