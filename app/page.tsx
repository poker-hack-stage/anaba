import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { Route } from "lucide-react";
import { AreaRotator } from "@/components/discover/area-rotator";
import { SpotCardSkeleton } from "@/components/spots/spot-card";
import {
  SpotSubmissionProvider,
  SpotSubmissionTrigger,
} from "@/components/submit/spot-submission";
import type { SubmittableArea } from "@/components/submit/spot-submission-form";
import { getAreas, getAreasWithSpots } from "@/lib/data/areas";

// 穴場を探す（トップページ）
export default function DiscoverPage() {
  return (
    <SpotSubmissionProvider areas={loadSubmittableAreas()}>
      <div className="flex flex-col gap-6">
        <Hero />
        <Suspense fallback={<DiscoverSkeleton />}>
          <Discover />
        </Suspense>
        <MobileSubmitCallout />
      </div>
    </SpotSubmissionProvider>
  );
}

/**
 * 「穴場を教える」のフォームで使う地域（#54）。待たずに Promise のまま渡し、ダイアログを開いたときに読む。
 * 読めなければ null（ページごとエラーにしない）
 */
async function loadSubmittableAreas(): Promise<SubmittableArea[] | null> {
  try {
    const areas = await getAreas();
    return areas.map(
      ({ id, name, prefecture, center_lat, center_lng, boundary }) => ({
        id,
        name,
        prefecture,
        center_lat,
        center_lng,
        boundary,
      }),
    );
  } catch (error) {
    // ビルド時の事前描画で cookies() が中断するときなど、Next.js の内部のエラーは握りつぶさない
    unstable_rethrow(error);
    console.error(error);
    return null;
  }
}

// スマホ（sm 未満）では画面を検索欄と地図に使うため、ヒーローは見せずに読み上げ用の見出しだけ残す（#93）。
// 「旅プランをつくる」の代わりは下部ナビの「AI旅プラン」、「穴場を教える」の代わりは MobileSubmitCallout
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

/**
 * スマホの「穴場を教える」の入口（#54）。スマホではヒーローを出さないので、地図と情報パネルのあと（ページの最後）に置く。
 * 検索欄や地図の上に置くと、最初の画面で地図が下に押し出されるため
 */
function MobileSubmitCallout() {
  return (
    <section
      aria-labelledby="submit-callout-heading"
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:hidden"
    >
      <div>
        <h2
          id="submit-callout-heading"
          className="font-brand text-base font-bold text-ink"
        >
          地元の穴場を知っていますか？
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          ログインなしで、地図にピンを置いて教えられます。
        </p>
      </div>
      <SpotSubmissionTrigger className="bg-ink text-white hover:bg-ink/90" />
    </section>
  );
}

async function Discover() {
  const areas = await getAreasWithSpots();
  return <AreaRotator areas={areas} />;
}

function DiscoverSkeleton() {
  return (
    // PC は地図が大きく出る（components/discover/area-rotator.tsx）。読み込み中も同じ大きさを取り、下のフッターが跳ねないようにする
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-7rem)] lg:animate-pulse lg:rounded-2xl lg:bg-stone-200/60">
      {/* 検索欄の行（components/discover/discover-search.tsx）の高さぶん */}
      <div className="h-[52px] animate-pulse rounded-xl bg-stone-200/60 sm:h-24 lg:hidden" />
      <section className="grid gap-4 lg:hidden">
        <div className="h-72 animate-pulse rounded-2xl bg-stone-200/60 sm:h-96" />
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
