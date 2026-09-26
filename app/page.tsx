import Link from "next/link";
import { Suspense } from "react";
import { Route } from "lucide-react";
import { AreaRotator } from "@/components/discover/area-rotator";
import { SpotSubmissionTrigger } from "@/components/submit/spot-submission";
import { getAreasWithSpots } from "@/lib/data/areas";

// 穴場を探す（トップページ）。
// data-fullscreen-map を付けると、スマホ（sm 未満）ではページ全体を縦にスクロールさせない（app/globals.css、#155）
export default function DiscoverPage() {
  return (
    <div data-fullscreen-map className="flex flex-col gap-6">
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
    // 地図の枠（components/discover/area-rotator.tsx）と同じ大きさを取り、読み込み後に跳ねないようにする。
    // スマホ・タブレットは地図の上に検索欄、下に情報パネルが浮かぶ（#142）ので、その位置に枠を出す
    <div className="relative -mx-4 -mt-5 h-[calc(100dvh-3.5rem-1px-57px)] animate-pulse overflow-hidden bg-stone-200/60 sm:mx-0 sm:mt-0 sm:h-[calc(100dvh-4rem-1px-57px-2.5rem)] sm:rounded-2xl md:h-[calc(100dvh-7rem)]">
      {/* 検索欄（components/discover/discover-search.tsx）の高さぶん */}
      <div className="absolute inset-x-3 top-3 h-10 rounded-xl bg-white/80 sm:h-24 sm:rounded-2xl lg:hidden" />
      {/* 情報パネル（components/discover/spot-panel.tsx）。地域の切り替え・地域名・カード1枚ぶん */}
      <div className="absolute inset-x-3 bottom-9 flex flex-col gap-2 rounded-2xl bg-white/80 p-3 sm:bottom-3 sm:right-auto sm:w-[420px] lg:hidden">
        <div className="h-8 w-48 rounded-lg bg-stone-200/60" />
        <div className="h-10 w-40 rounded-lg bg-stone-200/60" />
        <div className="h-7 w-full rounded-lg bg-stone-200/60" />
        <div className="h-[106px] w-[85%] rounded-2xl bg-stone-200/60" />
      </div>
    </div>
  );
}
