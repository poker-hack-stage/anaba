import { cn } from "@/lib/utils";

/**
 * 絞り込みなどで使う丸いボタン。button なので Tab で移動し、Enter / Space で切り替えられる。
 * 選択状態は aria-pressed で読み上げに伝える
 */
export function Chip({
  active,
  className,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        active
          ? "border-stone-900 bg-stone-900 text-white"
          : "border-stone-200 bg-white text-stone-600 hover:border-stone-400",
        className,
      )}
      {...props}
    />
  );
}
