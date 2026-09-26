"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "./nav-items";

/** スマホ用の下部ナビ。PC では HeaderTabs を使う */
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
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-stone-200 bg-white/95 px-2 py-1.5 backdrop-blur-lg md:hidden">
      {NAV_ITEMS.map(({ href, label, icon: Icon, activeClass }) => {
        const active = isActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            // 今いるタブを色だけでなく読み上げでも伝える（#124）
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center rounded-xl border px-6 py-1",
              active
                ? `${activeClass} font-bold`
                : "border-transparent text-stone-500",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="mt-0.5 text-[10px]">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
