"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { PREFECTURE_NAMES } from "@/lib/geo/prefectures";
import { cn } from "@/lib/utils";

/*
  47都道府県を選ぶ部品（AI旅プラン・穴場を教える）。
  ブラウザ標準の select だと47件が画面いっぱいに広がるので、高さを決めてスクロールする一覧にする。
  読み上げは WAI-ARIA の「select のみの combobox」の形（ボタンに role="combobox"、一覧に role="listbox"）。
  フォーカスはボタンに置いたまま aria-activedescendant で選んでいる項目を伝える。
  キーボード: ↓↑・Enter・Space で開く、↓↑・Home・End・PageDown・PageUp で動かす、Enter・Space で決める、Esc・Tab で閉じる
*/

/** 地方ごとのまとまり（都道府県コードの順で続いている）。一覧の見出しにする */
const REGIONS = [
  { name: "北海道・東北", from: 0, to: 7 },
  { name: "関東", from: 7, to: 14 },
  { name: "中部", from: 14, to: 23 },
  { name: "近畿", from: 23, to: 30 },
  { name: "中国", from: 30, to: 35 },
  { name: "四国", from: 35, to: 39 },
  { name: "九州・沖縄", from: 39, to: 47 },
] as const;

/** PageDown・PageUp で動かす数 */
const PAGE_STEP = 8;

const buttonShapes = {
  default:
    "h-9 rounded-md border-input pl-3 pr-9 text-base shadow-sm md:text-sm",
  // iOS の Safari は 16px 未満の欄にフォーカスすると画面を拡大するので、sm 未満だけ 16px にする（select.tsx と同じ）
  pill: "rounded-full border-stone-200 py-1.5 pl-3 pr-8 text-xs font-semibold text-stone-900 hover:border-stone-400 max-sm:text-base",
};

export type PrefectureSelectProps = {
  /** ボタンの id（<label htmlFor> で名前を付ける） */
  id: string;
  /** 選んでいる都道府県名。選んでいなければ "" */
  value: string;
  onChange: (prefecture: string) => void;
  /** 見た目。default は Input、pill は Chip に合わせる（select.tsx と同じ） */
  shape?: keyof typeof buttonShapes;
  /** 選んでいないときにボタンに出す文 */
  placeholder?: string;
  className?: string;
  /** ボタンに足すクラス（旅プランでは、選んでいるときに選択中の Chip と同じ濃い枠にする） */
  buttonClassName?: string;
  "aria-required"?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function PrefectureSelect({
  id,
  value,
  onChange,
  shape = "default",
  placeholder = "選ぶ",
  className,
  buttonClassName,
  ...aria
}: PrefectureSelectProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const optionId = (index: number) => `${listId}-${index}`;

  const openList = () => {
    setActive(Math.max(PREFECTURE_NAMES.indexOf(value as never), 0));
    setOpen(true);
  };

  const choose = (index: number) => {
    onChange(PREFECTURE_NAMES[index]);
    setOpen(false);
    buttonRef.current?.focus();
  };

  // 開いている間に外側を押したら閉じる
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  // 選んでいる項目が一覧の見えるところに来るようスクロールする
  useEffect(() => {
    if (open)
      optionRefs.current[active]?.scrollIntoView?.({ block: "nearest" });
  }, [open, active]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = PREFECTURE_NAMES.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    const move = (next: number) => {
      e.preventDefault();
      setActive(Math.min(Math.max(next, 0), last));
    };
    switch (e.key) {
      case "ArrowDown":
        return move(active + 1);
      case "ArrowUp":
        return move(active - 1);
      case "PageDown":
        return move(active + PAGE_STEP);
      case "PageUp":
        return move(active - PAGE_STEP);
      case "Home":
        return move(0);
      case "End":
        return move(last);
      case "Enter":
      case " ":
        e.preventDefault();
        return choose(active);
      case "Escape":
        e.preventDefault();
        return setOpen(false);
      case "Tab":
        return setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        {...aria}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "w-full cursor-pointer truncate border bg-white text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          buttonShapes[shape],
          value === "" && "text-stone-500",
          buttonClassName,
        )}
      >
        {value || placeholder}
      </button>
      <ChevronDown
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-stone-500 transition-transform",
          shape === "pill" ? "right-2.5 h-3.5 w-3.5" : "right-3 h-4 w-4",
          open && "rotate-180",
        )}
      />
      <ul
        id={listId}
        role="listbox"
        aria-labelledby={id}
        hidden={!open}
        // 押してもボタンからフォーカスを外さない（aria-activedescendant で伝えているため）
        onMouseDown={(e) => e.preventDefault()}
        className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full min-w-[11rem] overflow-y-auto overscroll-contain rounded-xl border border-stone-200 bg-white py-1 text-sm shadow-lg"
      >
        {REGIONS.map((region) => (
          <li key={region.name} role="presentation">
            <p
              aria-hidden
              className="px-3 pb-0.5 pt-2 text-[11px] font-bold text-stone-400"
            >
              {region.name}
            </p>
            <ul role="group" aria-label={region.name}>
              {PREFECTURE_NAMES.slice(region.from, region.to).map(
                (name, offset) => {
                  const index = region.from + offset;
                  const selected = name === value;
                  return (
                    <li
                      key={name}
                      ref={(el) => {
                        optionRefs.current[index] = el;
                      }}
                      id={optionId(index)}
                      role="option"
                      aria-selected={selected}
                      onClick={() => choose(index)}
                      onMouseMove={() => active !== index && setActive(index)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between px-3 py-1.5 text-stone-800",
                        index === active && "bg-stone-100",
                        selected && "font-bold text-ink",
                      )}
                    >
                      {name}
                      {selected && <Check aria-hidden className="h-4 w-4" />}
                    </li>
                  );
                },
              )}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
