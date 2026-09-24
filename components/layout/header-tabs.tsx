"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "./nav-items";

/** PC 用のタブ。スマホでは BottomNav を使う */
export function HeaderTabs() {
  // usePathname() は実行時に決まる値なので Suspense で囲む（fallback は選択状態なし）
  return (
    <Suspense fallback={<Tabs pathname={null} />}>
      <CurrentTabs />
    </Suspense>
  );
}

function CurrentTabs() {
  return <Tabs pathname={usePathname()} />;
}

function Tabs({ pathname }: { pathname: string | null }) {
  return (
    <nav className="hidden items-center gap-1.5 md:flex">
      {NAV_ITEMS.map(({ href, label, icon: Icon, activeClass }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-all",
            isActive(href, pathname)
              ? activeClass
              : "border-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-900",
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
