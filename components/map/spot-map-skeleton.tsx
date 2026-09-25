import { cn } from "@/lib/utils";

/**
 * 地図（spot-map.tsx）を読み込んでいる間に出す枠。
 * next/dynamic の loading に渡す。地図と同じ className を渡して大きさをそろえる。
 */
export function SpotMapSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-2xl border border-stone-200 bg-stone-200/60",
        className,
      )}
    />
  );
}
