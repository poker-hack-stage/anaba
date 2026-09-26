"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { useOpenSpotSubmission } from "@/components/submit/spot-submission";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive, type NavItem } from "./nav-items";

// 真ん中の「穴場を教える」ボタンの左右にタブを分ける（「穴場を探す」｜＋｜「AI旅プラン」）
const MIDDLE = Math.ceil(NAV_ITEMS.length / 2);

/**
 * スマホ用の下部ナビ。PC では HeaderTabs を使う。
 * 真ん中はページの移動ではなく、「穴場を教える」のダイアログを開くボタン（#134）
 */
export function BottomNav() {
  // usePathname() は実行時に決まる値なので Suspense で囲む（fallback は選択状態なし）
  return (
    <Suspense fallback={<Items pathname={null} />}>
      <CurrentItems />
    </Suspense>
  );
}

function CurrentItems() {
  return <Items pathname={usePathname()} />;
}

function Items({ pathname }: { pathname: string | null }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 items-end border-t border-stone-200 bg-white/95 px-2 py-1.5 backdrop-blur-lg md:hidden">
      {NAV_ITEMS.slice(0, MIDDLE).map((item) => (
        <Tab key={item.href} item={item} pathname={pathname} />
      ))}
      <SubmitButton />
      {NAV_ITEMS.slice(MIDDLE).map((item) => (
        <Tab key={item.href} item={item} pathname={pathname} />
      ))}
    </nav>
  );
}

function Tab({
  item: { href, label, icon: Icon, activeClass },
  pathname,
}: {
  item: NavItem;
  pathname: string | null;
}) {
  const active = isActive(href, pathname);
  return (
    <Link
      href={href}
      // 今いるタブを色だけでなく読み上げでも伝える（#124）
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 flex-col items-center justify-center justify-self-center rounded-xl border px-6 py-1",
        active
          ? `${activeClass} font-bold`
          : "border-transparent text-stone-500",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="mt-0.5 text-[10px]">{label}</span>
    </Link>
  );
}

/**
 * 「穴場を教える」のボタン。ほかのタブと同じ高さ・大きさにそろえ、ナビの上に飛び出させない（#163。目立ちすぎていたため）。
 * 何のボタンかが分かるよう、＋の小さな丸と文字はブランドの朱色のまま残す
 */
function SubmitButton() {
  const open = useOpenSpotSubmission();
  return (
    <button
      type="button"
      onClick={() => open?.()}
      aria-haspopup="dialog"
      className="flex min-h-11 flex-col items-center justify-center justify-self-center rounded-xl border border-transparent px-6 py-1 text-shu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink active:scale-95"
    >
      <span
        aria-hidden
        className="flex h-4 w-4 items-center justify-center rounded-full bg-shu text-white"
      >
        <Plus className="h-3 w-3" strokeWidth={3} />
      </span>
      <span className="mt-0.5 text-[10px] font-bold">穴場を教える</span>
    </button>
  );
}
