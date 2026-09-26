import { cn } from "@/lib/utils";

/**
 * anaba のロゴマーク。細い線の丸の中に、山の稜線・地面・洞窟の入口（穴）と、朱色の日。
 * 「山あいの穴場」をあらわす。線と丸は ink（currentColor）、日は shu。
 * 16px では細い線が消えるので、favicon（app/icon.svg）は線を太くした別の版にしている。形を変えるときは両方直す。
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={cn("h-9 w-9 text-ink", className)}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="20" cy="20" r="17.5" />
        {/* 山の稜線（両端は丸の線の上で止める） */}
        <path d="M3.2 24.8 L11 17 L17 22.5 L25 13 L37 24.1" />
        {/* 地面 */}
        <path d="M6 30.5 H34" />
        {/* 洞窟の入口（穴） */}
        <path d="M16 30.5 V27.5 A4 4 0 0 1 24 27.5 V30.5" />
      </g>
      {/* 日 */}
      <circle cx="29.5" cy="10.5" r="2.6" className="fill-shu" />
    </svg>
  );
}
