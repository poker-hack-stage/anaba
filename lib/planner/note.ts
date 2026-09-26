import type { Spot } from "@/lib/data/spots";

// AI旅プランの自由記述の希望（#114）。フォーム・/api/plan の検証・プロンプト・デモモードで共有する

/** 希望の長さの上限（見た目の1文字で数える） */
export const MAX_NOTE_LENGTH = 100;

/** 希望の長さ（見た目の1文字で数える。絵文字などのサロゲートペアも1文字） */
export function noteLength(text: string): number {
  return [...text].length;
}

/**
 * 希望を1行の文にする。改行・タブ・制御文字を空白にし、続く空白を1つにまとめ、前後の空白を取る。
 * 長さは切らない（上限を超えたら、/api/plan では受け付けない）
 */
export function normalizeNote(text: string): string {
  return text
    .replace(/[\p{Cc}\u2028\u2029]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** デモモード（#19）で希望から読み取れること。AI を使わないので、決まったキーワードだけを見る */
export type NoteHints = {
  /** 雨・屋内 → 屋内で楽しめるスポットを優先する */
  indoor: boolean;
  /** ゆっくり・のんびり → 1日のスポットを3件までにする */
  relaxed: boolean;
  /** 子ども・子連れ → 子どもと楽しめるタグのスポットを優先する */
  kids: boolean;
};

const NO_HINTS: NoteHints = { indoor: false, relaxed: false, kids: false };

const INDOOR_WORDS = /雨|屋内|室内/;
const RELAXED_WORDS = /ゆっくり|のんびり|ゆったり/;
const KIDS_WORDS = /子ども|子供|こども|子連れ|キッズ/;

export function readNoteHints(note: string | undefined): NoteHints {
  if (!note) return NO_HINTS;
  return {
    indoor: INDOOR_WORDS.test(note),
    relaxed: RELAXED_WORDS.test(note),
    kids: KIDS_WORDS.test(note),
  };
}

/** 屋内で楽しめるカテゴリ（食・カフェ、温泉・銭湯、手仕事・体験）と、屋内の施設を表すタグ */
const INDOOR_CATEGORIES: ReadonlySet<string> = new Set([
  "gourmet",
  "onsen",
  "craft",
]);
const INDOOR_TAGS = ["雨の日", "資料館", "美術館", "博物館"];

/** 子どもと楽しめる場所を表すタグ */
const KIDS_TAGS = ["子ども", "子連れ", "家族", "公園", "体験", "キャンプ場"];

/** 希望に合うスポットか（デモモードで、興味のあることの次に優先する） */
export function matchesNoteHints(spot: Spot, hints: NoteHints): boolean {
  if (
    hints.indoor &&
    (INDOOR_CATEGORIES.has(spot.category) ||
      spot.tags.some((tag) => INDOOR_TAGS.includes(tag)))
  ) {
    return true;
  }
  return hints.kids && spot.tags.some((tag) => KIDS_TAGS.includes(tag));
}
