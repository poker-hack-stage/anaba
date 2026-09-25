import type { Metadata } from "next";
import { Noto_Sans_JP, Zen_Maru_Gothic } from "next/font/google";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteHeader } from "@/components/layout/site-header";
import { PlannerStateProvider } from "@/components/planner/planner-state";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "anaba - 地元の穴場とAI旅プラン",
    template: "%s | anaba",
  },
  description:
    "地元の人が教える穴場スポットと、AIがつくる旅プランで、まだ知らない地域をめぐろう。",
};

const notoSansJP = Noto_Sans_JP({
  display: "swap",
  subsets: ["latin"],
});

// ロゴ・見出し用（tailwind の font-brand）
const zenMaruGothic = Zen_Maru_Gothic({
  weight: ["500", "700"],
  display: "swap",
  subsets: ["latin"],
  variable: "--font-brand",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.className} ${zenMaruGothic.variable} flex min-h-screen flex-col antialiased`}
      >
        <SiteHeader />
        {/* スマホでは下部ナビの高さぶん余白をとる */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-5 sm:px-6 md:pb-10 lg:px-8">
          <PlannerStateProvider>{children}</PlannerStateProvider>
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
