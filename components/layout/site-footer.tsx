import Link from "next/link";

/**
 * 画面の一番下のフッター。写真の出典（CC BY・CC BY-SA の表示の条件、#67）へリンクする。
 * スマホでは下部ナビ（bottom-nav.tsx）が画面の下に重なるので、その高さぶん下に余白をとる
 */
export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-7xl px-4 pb-24 pt-2 text-xs text-stone-500 sm:px-6 md:pb-8 lg:px-8">
      <nav aria-label="サイトの情報" className="flex flex-wrap gap-x-4 gap-y-1">
        <Link
          href="/credits"
          className="underline underline-offset-2 hover:text-shu"
        >
          写真の出典
        </Link>
      </nav>
    </footer>
  );
}
