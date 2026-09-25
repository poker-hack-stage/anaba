// 複数日の候補で、日ごとに使う色（docs/spec.md の 6.2・#57）。
// カードの日の見出しと、地図の線・マーカー（Leaflet、PR #41 のあと）で同じ色を使い、対応が分かるようにする

export type DayColor = {
  /** 地図の線・マーカーの色 */
  hex: string;
  /** 番号の丸の背景 */
  dot: string;
  /** 日の見出しの文字 */
  text: string;
  /** 経路のリストの縦線 */
  border: string;
};

const DAY_COLORS: DayColor[] = [
  {
    hex: "#c0432b", // 朱（ブランドのアクセント）
    dot: "bg-shu",
    text: "text-shu",
    border: "border-shu-border",
  },
  {
    hex: "#4f46e5",
    dot: "bg-indigo-600",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
  {
    hex: "#0f766e",
    dot: "bg-teal-700",
    text: "text-teal-800",
    border: "border-teal-200",
  },
];

/** 何日目（1から）の色。4日目以降は色を繰り返す */
export function getDayColor(day: number): DayColor {
  return DAY_COLORS[(day - 1) % DAY_COLORS.length];
}
