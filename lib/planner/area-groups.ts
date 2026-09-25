// 旅プランのエリアの select を、都道府県ごとの optgroup にまとめる（docs/spec.md の画面-1・#17）

export type PrefectureGroup<T> = {
  prefecture: string;
  areas: T[];
};

/**
 * 地域を都道府県ごとにまとめる。都道府県は、渡した順（display_order）で最初に出てきた順に並べ、
 * 都道府県の中の地域も渡した順のまま。北アルプス山麓（長野県）を先頭に置くシードの並びを崩さないため
 */
export function groupAreasByPrefecture<T extends { prefecture: string }>(
  areas: readonly T[],
): PrefectureGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const area of areas) {
    const group = groups.get(area.prefecture);
    if (group) group.push(area);
    else groups.set(area.prefecture, [area]);
  }
  return [...groups].map(([prefecture, areas]) => ({ prefecture, areas }));
}
