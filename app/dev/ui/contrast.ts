import colors from "tailwindcss/colors";
import tailwindConfig from "@/tailwind.config";

// WCAG 2.x のコントラスト比の計算（見本ページで使う）

function luminance(hex: string) {
  let digits = hex.replace("#", "");
  // tailwindcss/colors の white（#fff）のような3桁の書き方を6桁に直す
  if (digits.length === 3) digits = digits.replace(/./g, "$&$&");
  const [r, g, b] = (digits.match(/\w\w/g) ?? []).map((v) => {
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

/** tailwind.config.ts のブランドカラー（ink・shu・washi） */
export const brand = tailwindConfig.theme.extend.colors;

// app/globals.css の HSL の CSS 変数は読めないので書き写している。globals.css を変えたらここも直す
/** --muted-foreground（25 5% 42%） */
const MUTED_FOREGROUND = "#706a66";
/** --destructive-foreground（0 0% 98%） */
const DESTRUCTIVE_FOREGROUND = "#fafafa";

/**
 * アプリで使っている主な「文字色 × 背景色」の組み合わせ（すべてではない）。
 * 色は tailwindcss/colors と tailwind.config.ts から読むので、設定を変えれば表の比も変わる。
 * 色を足したり変えたりしたらここにも足し、見本ページで 4.5:1 以上か確かめる
 */
export const TEXT_PAIRS = [
  {
    usage: "本文",
    fg: colors.stone[900],
    bg: colors.stone[50],
    fgName: "stone-900",
    bgName: "stone-50（背景）",
  },
  {
    usage: "説明文・タグ",
    fg: colors.stone[600],
    bg: colors.stone[100],
    fgName: "stone-600",
    bgName: "stone-100",
  },
  {
    usage: "補足の小さい文字",
    fg: colors.stone[500],
    bg: colors.white,
    fgName: "stone-500",
    bgName: "white",
  },
  {
    usage: "補足の小さい文字（背景の上）",
    fg: colors.stone[500],
    bg: colors.stone[50],
    fgName: "stone-500",
    bgName: "stone-50",
  },
  {
    usage: "muted-foreground",
    fg: MUTED_FOREGROUND,
    bg: colors.stone[100],
    fgName: "muted-foreground",
    bgName: "muted（stone-100）",
  },
  {
    usage: "見出し",
    fg: brand.ink.DEFAULT,
    bg: brand.washi,
    fgName: "ink",
    bgName: "washi",
  },
  {
    usage: "アクセントの小見出し",
    fg: brand.shu.DEFAULT,
    bg: colors.white,
    fgName: "shu",
    bgName: "white",
  },
  {
    usage: "アクセントの小見出し（ヒーロー）",
    fg: brand.shu.DEFAULT,
    bg: brand.washi,
    fgName: "shu",
    bgName: "washi",
  },
  {
    usage: "選択中のタブ（AI旅プラン）",
    fg: brand.shu.DEFAULT,
    bg: brand.shu.light,
    fgName: "shu",
    bgName: "shu-light",
  },
  {
    usage: "選択中のタブ（穴場を探す）",
    fg: brand.ink.DEFAULT,
    bg: brand.ink.light,
    fgName: "ink",
    bgName: "ink-light",
  },
  {
    usage: "経路の番号",
    fg: colors.white,
    bg: brand.shu.DEFAULT,
    fgName: "white",
    bgName: "shu",
  },
  {
    usage: "メインボタン",
    fg: colors.white,
    bg: brand.ink.DEFAULT,
    fgName: "white",
    bgName: "ink",
  },
  {
    usage: "削除ボタン",
    fg: DESTRUCTIVE_FOREGROUND,
    bg: colors.red[600],
    fgName: "destructive-foreground",
    bgName: "destructive",
  },
  {
    usage: "星評価の数値",
    fg: colors.amber[700],
    bg: colors.white,
    fgName: "amber-700",
    bgName: "white",
  },
  {
    usage: "選択中のチップ",
    fg: colors.white,
    bg: colors.stone[900],
    fgName: "white",
    bgName: "stone-900",
  },
];
