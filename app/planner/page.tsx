import type { Metadata } from "next";
import { Suspense } from "react";
import { PlannerForm } from "@/components/planner/planner-form";
import { getAreas } from "@/lib/data/areas";

export const metadata: Metadata = {
  title: "AI旅プラン",
};

export default function PlannerPage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl bg-gradient-to-br from-hero-from via-hero-via to-hero-to p-5 sm:p-7">
        <h1 className="font-brand text-xl font-bold leading-snug text-white sm:text-2xl">
          条件を選ぶだけで、旅の候補を提案します。
        </h1>
        <p className="mt-1 text-sm text-ink-light">
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
  const areas = await getAreas();
  return <PlannerForm areaNames={areas.map((area) => area.name)} />;
}
