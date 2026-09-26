import Link from "next/link";
import { Suspense } from "react";
import { Route } from "lucide-react";
import { AreaRotator } from "@/components/discover/area-rotator";
import { SpotCardSkeleton } from "@/components/spots/spot-card";
import { SpotSubmissionTrigger } from "@/components/submit/spot-submission";
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

// スマホ（sm 未満）では画面を検索欄と地図に使うため、ヒーローは見せずに読み上げ用の見出しだけ残す（#93）。
// 「旅プランをつくる」の代わりは下部ナビの「AI旅プラン」、「穴場を教える」の代わりは下部ナビの真ん中のボタン（#134）
function Hero() {
  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-hero-from via-hero-via to-hero-to p-5 max-sm:sr-only sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div>
        <h1 className="font-brand text-xl font-bold leading-snug text-white sm:text-2xl">
          地元の人の「いつもの場所」へ。
        </h1>
        <p className="mt-1 text-sm text-ink-light">
          地域の人が教える穴場を、地図でめぐろう。
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 max-sm:hidden">
        <SpotSubmissionTrigger className="border border-white/80 text-white hover:bg-white/10 focus-visible:ring-white focus-visible:ring-offset-hero-via" />
        <Link
          href="/planner"
          className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-ink hover:bg-ink-light"
        >
          <Route className="h-4 w-4" />
          旅プランをつくる
        </Link>
      </div>
    </section>
  );
}

async function Discover() {
  const areas = await getAreasWithSpots();
  return <AreaRotator areas={areas} />;
}

function DiscoverSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* 検索欄の行（components/discover/discover-search.tsx）の高さぶん */}
      <div className="h-[52px] animate-pulse rounded-xl bg-stone-200/60 sm:h-24 lg:h-10" />
      <section className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <div className="h-72 animate-pulse rounded-2xl bg-stone-200/60 sm:h-96 lg:h-[520px]" />
        <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5">
          <div className="h-12 w-40 animate-pulse rounded-lg bg-stone-200/60" />
          <SpotCardSkeleton />
          <SpotCardSkeleton />
          <SpotCardSkeleton />
        </div>
      </section>
    </div>
  );
}
