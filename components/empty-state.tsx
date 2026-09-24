import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** データがまだないときの表示 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
        <Icon className="h-6 w-6 text-stone-400" />
      </div>
      <p className="font-bold text-stone-700">{title}</p>
      {description && (
        <p className="max-w-xs text-xs leading-relaxed text-stone-500">
          {description}
        </p>
      )}
    </div>
  );
}
