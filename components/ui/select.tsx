import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// 見た目は Input（default）と Chip（pill）に合わせる。フォーカスリングは Chip と同じ
const selectVariants = cva(
  "peer w-full cursor-pointer appearance-none border bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      shape: {
        default:
          "h-9 rounded-md border-input pl-3 pr-9 text-base shadow-sm md:text-sm",
        // iOS の Safari は 16px 未満の select にフォーカスすると画面を拡大するので、sm 未満だけ 16px にする（#124）
        pill: "rounded-full border-stone-200 py-1.5 pl-3 pr-8 text-xs font-semibold text-stone-900 hover:border-stone-400 max-sm:text-base",
      },
    },
    defaultVariants: { shape: "default" },
  },
);

const chevronVariants = cva(
  "pointer-events-none absolute top-1/2 -translate-y-1/2 text-stone-500 peer-disabled:opacity-50",
  {
    variants: {
      shape: {
        default: "right-3 h-4 w-4",
        pill: "right-2.5 h-3.5 w-3.5",
      },
    },
    defaultVariants: { shape: "default" },
  },
);

export interface SelectProps
  extends React.ComponentProps<"select">, VariantProps<typeof selectVariants> {
  /** 外側の枠（select と矢印を包む div）のクラス。flex-1 などの並べ方はここに付ける */
  containerClassName?: string;
}

/**
 * ブラウザ標準の select に見た目を付けた部品。optgroup でまとめられ、スマホでは OS 標準の選び方になる。
 * キーボード操作・読み上げもブラウザに任せる（Radix の Select にしないのはこのため。#75）
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, containerClassName, shape, ...props }, ref) => (
    <div className={cn("relative", containerClassName)}>
      <select
        ref={ref}
        className={cn(selectVariants({ shape }), className)}
        {...props}
      />
      <ChevronDown aria-hidden className={chevronVariants({ shape })} />
    </div>
  ),
);
Select.displayName = "Select";

export { Select };
