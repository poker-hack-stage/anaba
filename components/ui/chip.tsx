import { cn } from "@/lib/utils";

/** 絞り込みなどで使う丸いボタン */
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
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "border-stone-900 bg-stone-900 text-white"
          : "border-stone-200 bg-white text-stone-600 hover:border-stone-400",
        className,
      )}
      {...props}
    />
  );
}
