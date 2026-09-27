import type { LngLatBox } from "@/lib/map/bounds";

// 「穴場を教える」で入力する市区町村の候補と、地図を移動する範囲。
// データは municipalities.json（scripts/municipalities/build.mjs が Geolonia 住所データから作る。CC BY 4.0）。
// 65KB ほどあるので、画面では loadMunicipalities() で使うときに読み、ページの最初の読み込みには入れない

/** municipalities.json の1件: [名前, 西, 南, 東, 北]（経度・緯度） */
export type RawMunicipality = [string, number, number, number, number];
export type RawMunicipalities = Record<string, RawMunicipality[]>;

export type Municipality = {
  name: string;
  /** 町丁目の代表点から求めたおおよその範囲（[[西, 南], [東, 北]]）。地図の移動に使う */
  bounds: LngLatBox;
};

/** 都道府県名 → その県の市区町村（元のデータの順） */
export type MunicipalityIndex = Readonly<
  Record<string, readonly Municipality[]>
>;

/** 市区町村の名前の出典（CC BY 4.0 の表示） */
export const MUNICIPALITY_ATTRIBUTION =
  "市区町村の候補: Geolonia 住所データ（CC BY 4.0）";

export function toMunicipalityIndex(raw: RawMunicipalities): MunicipalityIndex {
  const index: Record<string, Municipality[]> = {};
  for (const [prefecture, list] of Object.entries(raw)) {
    index[prefecture] = list.map(([name, west, south, east, north]) => ({
      name,
      bounds: [
        [west, south],
        [east, north],
      ],
    }));
  }
  return index;
}

/** 候補を読む。一度読んだら使い回す。読めなければ null（次に呼んだときに読み直す） */
let loading: Promise<MunicipalityIndex | null> | null = null;
export function loadMunicipalities(): Promise<MunicipalityIndex | null> {
  loading ??= import("./municipalities.json")
    .then((m) => toMunicipalityIndex(m.default as unknown as RawMunicipalities))
    .catch((error: unknown) => {
      console.error("市区町村の候補を読み込めませんでした", error);
      loading = null;
      return null;
    });
  return loading;
}

/** 県の中から名前がちょうど同じ市区町村を探す（前後の空白は無視する） */
export function findMunicipality(
  index: MunicipalityIndex,
  prefecture: string,
  name: string,
): Municipality | undefined {
  const trimmed = name.trim();
  if (trimmed === "") return undefined;
  return index[prefecture]?.find((m) => m.name === trimmed);
}

/** 県の市区町村をすべて含む範囲。県を選んで市区町村をまだ決めていないときに、地図をその県に移す */
export function prefectureBounds(
  index: MunicipalityIndex,
  prefecture: string,
): LngLatBox | null {
  const list = index[prefecture];
  if (!list || list.length === 0) return null;
  let [[west, south], [east, north]] = list[0].bounds;
  for (const { bounds } of list) {
    west = Math.min(west, bounds[0][0]);
    south = Math.min(south, bounds[0][1]);
    east = Math.max(east, bounds[1][0]);
    north = Math.max(north, bounds[1][1]);
  }
  return [
    [west, south],
    [east, north],
  ];
}
