import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { HeaderTabs } from "./header-tabs";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <LogoMark />
          <span className="font-brand text-xl font-bold tracking-wide text-ink">
            めぐりまち
          </span>
        </Link>

        <HeaderTabs />
      </div>
    </header>
  );
}
