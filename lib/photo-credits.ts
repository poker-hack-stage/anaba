// アプリで使う写真の出典（撮影者・ライセンス・元の場所）。「写真の出典」ページ（app/credits）がこれを表示する。
// 写真を足したら、public/images/ にファイルを置き、supabase/seed.sql の image_path と、ここに1件ずつ足す。
// CC BY・CC BY-SA は、撮影者とライセンスを見る人に分かる形で示すことが条件なので、必ずここに書く（#67）

export type PhotoCredit = {
  /** public/ からのパス（spots.image_path と同じ値） */
  path: string;
  /** 写っているもの（スポット名） */
  subject: string;
  /** 撮影者（Wikimedia Commons の表記） */
  author: string;
  /** ライセンスの短い名前 */
  license: string;
  /** ライセンスの本文。パブリックドメインは null */
  licenseUrl: string | null;
  /** 元の写真のページ */
  sourceUrl: string;
};

/** 元の写真からの変更。CC BY・CC BY-SA では、変更したことを示す */
export const PHOTO_CHANGES = "長辺を1200px以下に縮小し、JPEG で圧縮した";

const BY_3 = "https://creativecommons.org/licenses/by/3.0";
const BY_4 = "https://creativecommons.org/licenses/by/4.0";
const BY_SA_3 = "https://creativecommons.org/licenses/by-sa/3.0";
const BY_SA_4 = "https://creativecommons.org/licenses/by-sa/4.0";
const CC0 = "https://creativecommons.org/publicdomain/zero/1.0";
const COMMONS = "https://commons.wikimedia.org/wiki/File:";

export const PHOTO_CREDITS: PhotoCredit[] = [
  {
    path: "/images/spots/hakuba-01.jpg",
    subject: "白馬塩の道温泉 倉下の湯",
    author: "Qurren",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}Kurashita_no_yu.jpg`,
  },
  {
    path: "/images/spots/hakuba-02.jpg",
    subject: "青鬼集落",
    author: "くろふね",
    license: "CC BY 3.0",
    licenseUrl: BY_3,
    sourceUrl: `${COMMONS}%E9%9D%92%E9%AC%BC%E9%9B%86%E8%90%BD_-_panoramio.jpg`,
  },
  {
    path: "/images/spots/hakuba-03.jpg",
    subject: "大出公園",
    author: "くろふね",
    license: "CC BY 3.0",
    licenseUrl: BY_3,
    sourceUrl: `${COMMONS}%E5%A4%A7%E5%87%BA%E5%90%8A%E6%A9%8B_-_panoramio_(4).jpg`,
  },
  {
    path: "/images/spots/hakuba-04.jpg",
    subject: "姫川源流自然探勝園",
    author: "くろふね",
    license: "CC BY 3.0",
    licenseUrl: BY_3,
    sourceUrl: `${COMMONS}%E5%A7%AB%E5%B7%9D%E6%BA%90%E6%B5%81_-_panoramio.jpg`,
  },
  {
    path: "/images/spots/omachi-01.jpg",
    subject: "塩の道ちょうじや",
    author: "Suikotei",
    license: "CC BY 4.0",
    licenseUrl: BY_4,
    sourceUrl: `${COMMONS}Hirabayashi-ke_Jyutaku_Shuoku.jpg`,
  },
  {
    path: "/images/spots/omachi-03.jpg",
    subject: "ぽかぽかランド美麻",
    author: "小石川人晃",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}Road_Station_Poka-Poka_Land_Miasa_01.jpg`,
  },
  {
    path: "/images/spots/omachi-07.jpg",
    subject: "中綱湖",
    author: "くろふね",
    license: "CC BY 3.0",
    licenseUrl: BY_3,
    sourceUrl: `${COMMONS}%E4%B8%AD%E7%B6%B1%E6%B9%96_-_panoramio.jpg`,
  },
  {
    path: "/images/spots/ikeda-05.jpg",
    subject: "花紋大雪渓",
    author: "Qurren",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}Daisekkei_Sake_Brewing_1.jpg`,
  },
  {
    path: "/images/spots/azumino-04.jpg",
    subject: "貞享義民記念館",
    author: "小松宏彰",
    license: "パブリックドメイン",
    licenseUrl: null,
    sourceUrl: `${COMMONS}Kinenkan.JPG`,
  },
  {
    path: "/images/spots/azumino-06.jpg",
    subject: "御宝田遊水池",
    author: "アポロ2",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}%E5%BE%A1%E5%AE%9D%E7%94%B0%E9%81%8A%E6%B0%B4%E6%B1%A0.jpg`,
  },
  {
    path: "/images/spots/azumino-07.jpg",
    subject: "烏川渓谷緑地",
    author: "Qurren",
    license: "CC BY-SA 3.0",
    licenseUrl: BY_SA_3,
    sourceUrl: `${COMMONS}Karasu_River_view_from_Karasugawakeikokubashi-bridge.jpg`,
  },
  {
    path: "/images/spots/matsumoto-01.jpg",
    subject: "松本市はかり資料館",
    author: "663highland",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}250425_Matsumoto_City_Hakari_Museum_Matsumoto_Nagano_pref_Japan01s3.jpg`,
  },
  {
    path: "/images/spots/matsumoto-05.jpg",
    subject: "源智の井戸",
    author: "深志",
    license: "CC BY-SA 3.0",
    licenseUrl: BY_SA_3,
    sourceUrl: `${COMMONS}%E6%BA%90%E6%99%BA%E3%81%AE%E4%BA%95%E6%88%B8.jpg`,
  },
  {
    path: "/images/spots/matsumoto-06.jpg",
    subject: "馬場家住宅",
    author: "Wiiii",
    license: "CC BY-SA 3.0",
    licenseUrl: BY_SA_3,
    sourceUrl: `${COMMONS}Babake_house_2010.jpg`,
  },
  {
    path: "/images/spots/matsumoto-07.jpg",
    subject: "弘法山古墳",
    author: "Saigen Jiro",
    license: "CC0",
    licenseUrl: CC0,
    sourceUrl: `${COMMONS}Koboyama_Kofun_zenkei.JPG`,
  },
];
