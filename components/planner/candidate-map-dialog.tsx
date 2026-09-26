"use client";

import dynamic from "next/dynamic";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Maximize2, X } from "lucide-react";
import { SpotMapSkeleton } from "@/components/map/spot-map-skeleton";
import type { SpotRoute } from "@/components/map/spot-map";
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Spot } from "@/lib/data/spots";
import { cn } from "@/lib/utils";

const MAP_CLASS_NAME = "min-h-0 flex-1 rounded-none border-0";

// 地図（MapLibre）は window と WebGL を使うので、サーバーでは描画しない
const SpotMap = dynamic(
  () => import("@/components/map/spot-map").then((m) => m.SpotMap),
  { ssr: false, loading: () => <SpotMapSkeleton className={MAP_CLASS_NAME} /> },
);

/**
 * 候補カードの地図を大きく見る（#31）。拡大ボタンと、大きな地図のダイアログ。
 * 地図にはカードと同じ routes・others・onSpotClick を渡すので、経路・日ごとの色・凡例・ピンを押したときの動きがカードとそろう。
 * スマホ（sm 未満）では画面いっぱい、sm 以上では画面の中央に大きく出す。
 * 閉じるのは Esc・閉じるボタン・背景のクリック。閉じたあとのフォーカスは拡大ボタンに戻る（Radix の Trigger に任せる）
 */
export function CandidateMapDialog({
  title,
  routes,
  others,
  onSpotClick,
  className,
}: {
  /** ダイアログの見出し（候補のタイトル） */
  title: string;
  routes: SpotRoute[];
  others: Spot[];
  onSpotClick: (spot: Spot) => void;
  /** 拡大ボタンの位置 */
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        aria-label="地図を大きく見る"
        title="地図を大きく見る"
        // 地図の＋−ボタン（MapLibre）と同じ見た目にそろえる
        className={cn(
          "flex h-[29px] w-[29px] items-center justify-center rounded bg-white text-stone-700 shadow-[0_0_0_2px_rgba(0,0,0,0.1)] hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          className,
        )}
      >
        <Maximize2 aria-hidden className="h-4 w-4" />
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay className="bg-stone-900/50 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white shadow-2xl duration-200 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:h-[85dvh] sm:w-[calc(100%-2rem)] sm:max-w-5xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-3xl sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-center gap-3 border-b border-stone-200 py-2 pl-4 pr-2">
            <DialogPrimitive.Title className="line-clamp-2 min-w-0 flex-1 font-extrabold leading-snug text-stone-900">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              候補の経路を大きな地図で見られます。ピンを押すとスポットの詳細が開きます。
            </DialogPrimitive.Description>
            <DialogPrimitive.Close
              aria-label="閉じる"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <SpotMap
            routes={routes}
            others={others}
            onSpotClick={onSpotClick}
            className={MAP_CLASS_NAME}
          />
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
