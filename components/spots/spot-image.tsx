import { getCategory } from "@/lib/spots/categories";
import { cn } from "@/lib/utils";

/**
 * スポットの写真。
 * TODO(#15): Supabase Storage の画像（spots.image_path）を表示する。今はカテゴリ色のプレースホルダーのみ
 */
export function SpotImage({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const meta = getCategory(category);

  return (
    <div
      className={cn("flex items-center justify-center text-4xl", className)}
      style={{
        background: `linear-gradient(135deg, ${meta.color}33, ${meta.color}88)`,
      }}
    >
      {/* アイコンの大きさは文字の大きさ（text-4xl など）に合わせる */}
      <meta.icon
        aria-hidden
        className="h-[1em] w-[1em]"
        style={{ color: meta.color }}
        strokeWidth={1.5}
      />
    </div>
  );
}
