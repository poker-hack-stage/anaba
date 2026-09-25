"use client";

import { CloudOff, RotateCw } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

/**
 * ページの読み込みに失敗したときの表示（#25）。
 * Supabase に接続できないと、トップページと /planner の getAreasWithSpots() がエラーを投げる。
 * ヘッダーとタブはルートのレイアウトにあるので、この表示の上下に残り、ほかのページへ移れる。
 * エラーの中身はサーバーのログに出る。本番ではブラウザに届かない（digest だけ）ので、画面には出さない
 */
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4">
      <EmptyState
        icon={CloudOff}
        title="データを読み込めませんでした"
        description="通信状況を確かめて、しばらくしてからもう一度お試しください。"
        className="w-full"
      />
      <Button type="button" variant="outline" onClick={() => retry()}>
        <RotateCw />
        もう一度読み込む
      </Button>
    </div>
  );
}
