import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { HeaderTabs } from "./header-tabs";
import { PAGE_CONTAINER } from "./page-width";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-md">
      <div
        className={`${PAGE_CONTAINER} flex h-14 items-center justify-between gap-4 sm:h-16`}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <LogoMark />
          <span className="flex flex-col leading-none">
            <span className="font-brand text-xl font-medium tracking-[0.12em] text-ink">
              anaba
            </span>
            <span className="mt-1 hidden text-[10px] tracking-wider text-stone-500 sm:block">
              地元の人が教える穴場
            </span>
          </span>
        </Link>

        <HeaderTabs />
      </div>
    </header>
  );
}
