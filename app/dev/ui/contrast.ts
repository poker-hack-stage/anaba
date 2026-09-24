// WCAG 2.x のコントラスト比の計算（見本ページで使う）

function luminance(hex: string) {
  const [r, g, b] = (hex.replace("#", "").match(/\w\w/g) ?? []).map((v) => {
    const c = parseInt(v, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string) {
  const [light, dark] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (light + 0.05) / (dark + 0.05);
}

/**
 * アプリで実際に使っている「文字色 × 背景色」の組み合わせ。
 * 色を足したり変えたりしたらここにも足し、見本ページで 4.5:1 以上か確かめる
 */
export const TEXT_PAIRS = [
  {
    usage: "本文",
    fg: "#1c1917",
    bg: "#fafaf9",
    fgName: "stone-900",
    bgName: "stone-50（背景）",
  },
  {
    usage: "説明文・タグ",
    fg: "#57534e",
    bg: "#f5f5f4",
    fgName: "stone-600",
    bgName: "stone-100",
  },
  {
    usage: "補足の小さい文字",
    fg: "#78716c",
    bg: "#ffffff",
    fgName: "stone-500",
    bgName: "white",
  },
  {
    usage: "補足の小さい文字（背景の上）",
    fg: "#78716c",
    bg: "#fafaf9",
    fgName: "stone-500",
    bgName: "stone-50",
  },
  {
    usage: "muted-foreground",
    fg: "#706a66",
    bg: "#f5f5f4",
    fgName: "muted-foreground",
    bgName: "muted（stone-100）",
  },
  {
    usage: "見出し",
    fg: "#24463d",
    bg: "#f6f1e7",
    fgName: "ink",
    bgName: "washi",
  },
  {
    usage: "アクセントの小見出し",
    fg: "#c0432b",
    bg: "#ffffff",
    fgName: "shu",
    bgName: "white",
  },
  {
    usage: "アクセントの小見出し（ヒーロー）",
    fg: "#c0432b",
    bg: "#f6f1e7",
    fgName: "shu",
    bgName: "washi",
  },
  {
    usage: "選択中のタブ（AI旅プラン）",
    fg: "#c0432b",
    bg: "#fcf0ec",
    fgName: "shu",
    bgName: "shu-light",
  },
  {
    usage: "選択中のタブ（穴場を探す）",
    fg: "#24463d",
    bg: "#e7efeb",
    fgName: "ink",
    bgName: "ink-light",
  },
  {
    usage: "経路の番号",
    fg: "#ffffff",
    bg: "#c0432b",
    fgName: "white",
    bgName: "shu",
  },
  {
    usage: "メインボタン",
    fg: "#ffffff",
    bg: "#24463d",
    fgName: "white",
    bgName: "ink",
  },
  {
    usage: "削除ボタン",
    fg: "#fafafa",
    bg: "#dc2626",
    fgName: "destructive-foreground",
    bgName: "destructive",
  },
  {
    usage: "星評価の数値",
    fg: "#b45309",
    bg: "#ffffff",
    fgName: "amber-700",
    bgName: "white",
  },
  {
    usage: "選択中のチップ",
    fg: "#ffffff",
    bg: "#1c1917",
    fgName: "white",
    bgName: "stone-900",
  },
] as const;
