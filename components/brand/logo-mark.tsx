import { cn } from "@/lib/utils";

/**
 * anaba のロゴマーク。御朱印のような朱色のスタンプ。
 * 少し傾けて、手で押したような雰囲気にしている。
 * favicon（app/icon.svg）も同じデザインなので、変えるときは両方直す。
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={cn("h-9 w-9 -rotate-6 text-shu", className)}
    >
      <circle
        cx="20"
        cy="20"
        r="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <circle
        cx="20"
        cy="20"
        r="14.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
      />
      <text
        x="20"
        y="21"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        fontSize="19"
        fontWeight="700"
        style={{ fontFamily: "var(--font-brand), sans-serif" }}
      >
        め
      </text>
    </svg>
  );
}
