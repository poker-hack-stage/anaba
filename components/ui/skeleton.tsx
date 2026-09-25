import { cn } from "@/lib/utils";

/**
 * 読み込み中の仮表示（shadcn/ui の skeleton）。
 * 色は既存の画面の仮表示（bg-stone-200/60）に合わせている
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-stone-200/60", className)}
      {...props}
    />
  );
}

export { Skeleton };
