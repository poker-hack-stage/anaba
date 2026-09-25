"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/chip";

const OPTIONS = ["のんびり", "グルメ", "自然", "歴史", "温泉"];

/** チップの見本（複数選択）。Tab で移動し、Enter / Space で切り替えられる */
export function ChipDemo() {
  const [selected, setSelected] = useState<string[]>(["グルメ"]);

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label="旅の気分"
        className="flex flex-wrap gap-1.5"
      >
        {OPTIONS.map((option) => (
          <Chip
            key={option}
            active={selected.includes(option)}
            onClick={() =>
              setSelected((prev) =>
                prev.includes(option)
                  ? prev.filter((v) => v !== option)
                  : [...prev, option],
              )
            }
          >
            {option}
          </Chip>
        ))}
        <Chip disabled>選べない</Chip>
      </div>
      <p className="text-xs text-stone-600">
        選択中: {selected.length > 0 ? selected.join("、") : "なし"}
      </p>
    </div>
  );
}
