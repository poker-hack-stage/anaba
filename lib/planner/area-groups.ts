// 地域を都道府県ごとにまとめる。旅プランと「穴場を教える」の、都道府県 → 市区町村の2段の select で使う（docs/spec.md の画面-1・#17・#147）

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

/**
 * 都道府県の地域を、渡した順のまま返す。旅プランで県だけ選んで市区町村を選ばないとき（#147）の、1日目の候補にする地域。
 * 県を選んでいない（undefined）・地域が1つもない県なら undefined（「おまかせ」として全国から選ぶ）
 */
export function findPrefectureAreas<T extends { prefecture: string }>(
  areas: readonly T[],
  prefecture: string | undefined,
): T[] | undefined {
  if (prefecture === undefined) return undefined;
  const found = areas.filter((area) => area.prefecture === prefecture);
  return found.length > 0 ? found : undefined;
}
