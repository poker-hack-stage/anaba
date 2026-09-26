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
 * ヘッダー・フッター・下のタブはルートのレイアウトにあるので、この表示の上下に残る。見た目は app/error.tsx に合わせる
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4">
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
