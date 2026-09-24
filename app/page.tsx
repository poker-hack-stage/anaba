import Link from "next/link";
import { Suspense } from "react";
import { Route } from "lucide-react";
import { AreaRotator } from "@/components/discover/area-rotator";
import { SpotCardSkeleton } from "@/components/spots/spot-card";
import { getAreasWithSpots } from "@/lib/data/areas";

// 穴場を探す（トップページ）
export default function DiscoverPage() {
  return (
    <div className="flex flex-col gap-6">
      <Hero />
      <Suspense fallback={<DiscoverSkeleton />}>
        <Discover />
      </Suspense>
    </div>
  );
}

function Hero() {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-washi p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div>
        <h1 className="font-brand text-xl font-bold leading-snug text-ink sm:text-2xl">
          地元の人の「いつもの場所」へ。
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          地域の人が教える穴場を、地図でめぐろう。
        </p>
      </div>
      <Link
        href="/planner"
        className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white hover:bg-ink/90"
      >
        <Route className="h-4 w-4" />
        旅プランをつくる
      </Link>
    </section>
  );
}

async function Discover() {
  const areas = await getAreasWithSpots();
  return <AreaRotator areas={areas} />;
}

function DiscoverSkeleton() {
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_400px]">
      <div className="h-72 animate-pulse rounded-2xl bg-stone-200/60 sm:h-96 lg:h-[520px]" />
      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5">
        <div className="h-12 w-40 animate-pulse rounded-lg bg-stone-200/60" />
        <SpotCardSkeleton />
        <SpotCardSkeleton />
        <SpotCardSkeleton />
      </div>
    </section>
  );
}
