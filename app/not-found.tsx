import type { Metadata } from "next";
import Link from "next/link";
import { MapPinOff, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "ページが見つかりませんでした",
};

/**
 * 存在しない URL を開いたときの表示（#124）。Next.js の英語の既定の 404 の代わりに出す。
 * ヘッダー・フッター・下のタブはルートのレイアウトにあるので、この表示の上下に残る。見た目は app/error.tsx に合わせる。
 * 大きい画面（2xl 以上）では、写真の出典（app/credits）と同じ幅（max-w-3xl）に収める。1280px 以下の見た目は変えない（#137）
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex w-full flex-col items-center gap-4 2xl:max-w-3xl">
      <EmptyState
        icon={MapPinOff}
        title="ページが見つかりませんでした"
        description="URL がまちがっているか、ページが移動・削除された可能性があります。"
        className="w-full"
      />
      <Button asChild>
        <Link href="/">
          <Search />
          穴場を探す
        </Link>
      </Button>
    </div>
  );
}
