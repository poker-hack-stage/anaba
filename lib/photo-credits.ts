// アプリで使う写真の出典（撮影者・ライセンス・元の場所）。「写真の出典」ページ（app/credits）がこれを表示する。
// 写真を足したら、public/images/ にファイルを置き、supabase/seed.sql の image_path と、ここに1件ずつ足す。
// CC BY・CC BY-SA は、撮影者・ライセンス・元の題名を見る人に分かる形で示すことが条件なので、必ずここに書く（#67）

export type PhotoCredit = {
  /** public/ からのパス（spots.image_path と同じ値） */
  path: string;
  /** 写っているもの（スポット名） */
  subject: string;
  /**
   * 元の写真の題名。CC BY・CC BY-SA は題名が付いていれば表示を求めるので、必ず書く。
   * Flickr は写真のページの題名、Commons はファイルページの名前（`File:` を除き、`_` を空白にしたもの）
   */
  title: string;
  /** 撮影者（元の写真のページの表記） */
  author: string;
  /** ライセンスの短い名前 */
  license: string;
  /** ライセンスの本文。パブリックドメインは null */
  licenseUrl: string | null;
  /** 元の写真のページ */
  sourceUrl: string;
  /** 元の写真を公開しているサイト */
  sourceName: "Wikimedia Commons" | "Flickr";
};

/** 元の写真からの変更。CC BY・CC BY-SA では、変更したことを示す */
export const PHOTO_CHANGES = "長辺を1200px以下に縮小し、JPEG で圧縮した";

const BY_2 = "https://creativecommons.org/licenses/by/2.0";
const BY_3 = "https://creativecommons.org/licenses/by/3.0";
const BY_4 = "https://creativecommons.org/licenses/by/4.0";
const BY_SA_3 = "https://creativecommons.org/licenses/by-sa/3.0";
const BY_SA_4 = "https://creativecommons.org/licenses/by-sa/4.0";
const CC0 = "https://creativecommons.org/publicdomain/zero/1.0";
const COMMONS = "https://commons.wikimedia.org/wiki/File:";
const FLICKR = "https://www.flickr.com/photos/";

export const PHOTO_CREDITS: PhotoCredit[] = [
  {
    path: "/images/spots/hakuba-01.jpg",
    subject: "白馬塩の道温泉 倉下の湯",
    title: "Kurashita no yu.jpg",
    author: "Qurren",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}Kurashita_no_yu.jpg`,
    sourceName: "Wikimedia Commons",
  },
  {
    path: "/images/spots/hakuba-02.jpg",
    subject: "青鬼集落",
    title: "青鬼集落 - panoramio.jpg",
    author: "くろふね",
    license: "CC BY 3.0",
    licenseUrl: BY_3,
    sourceUrl: `${COMMONS}%E9%9D%92%E9%AC%BC%E9%9B%86%E8%90%BD_-_panoramio.jpg`,
    sourceName: "Wikimedia Commons",
  },
  {
    path: "/images/spots/hakuba-03.jpg",
    subject: "大出公園",
    title: "大出吊橋 - panoramio (4).jpg",
    author: "くろふね",
    license: "CC BY 3.0",
    licenseUrl: BY_3,
    sourceUrl: `${COMMONS}%E5%A4%A7%E5%87%BA%E5%90%8A%E6%A9%8B_-_panoramio_(4).jpg`,
    sourceName: "Wikimedia Commons",
  },
  {
    path: "/images/spots/hakuba-04.jpg",
    subject: "姫川源流自然探勝園",
    title: "姫川源流 - panoramio.jpg",
    author: "くろふね",
    license: "CC BY 3.0",
    licenseUrl: BY_3,
    sourceUrl: `${COMMONS}%E5%A7%AB%E5%B7%9D%E6%BA%90%E6%B5%81_-_panoramio.jpg`,
    sourceName: "Wikimedia Commons",
  },
  {
    path: "/images/spots/hakuba-06.jpg",
    subject: "貞麟寺",
    title: "桜@貞麟寺",
    author: "wakaba-shinshu",
    license: "CC BY 2.0",
    licenseUrl: BY_2,
    sourceUrl: `${FLICKR}154568645@N04/34658438162`,
    sourceName: "Flickr",
  },
  {
    path: "/images/spots/omachi-01.jpg",
    subject: "塩の道ちょうじや",
    title: "Hirabayashi-ke Jyutaku Shuoku.jpg",
    author: "Suikotei",
    license: "CC BY 4.0",
    licenseUrl: BY_4,
    sourceUrl: `${COMMONS}Hirabayashi-ke_Jyutaku_Shuoku.jpg`,
    sourceName: "Wikimedia Commons",
  },
  {
    path: "/images/spots/omachi-02.jpg",
    subject: "若一王子神社",
    title: "若一王子神社鳥居と三重塔.jpg",
    author: "Furudanuki",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}%E8%8B%A5%E4%B8%80%E7%8E%8B%E5%AD%90%E7%A5%9E%E7%A4%BE%E9%B3%A5%E5%B1%85%E3%81%A8%E4%B8%89%E9%87%8D%E5%A1%94.jpg`,
    sourceName: "Wikimedia Commons",
  },
  {
    path: "/images/spots/omachi-03.jpg",
    subject: "ぽかぽかランド美麻",
    title: "Road Station Poka-Poka Land Miasa 01.jpg",
    author: "小石川人晃",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}Road_Station_Poka-Poka_Land_Miasa_01.jpg`,
    sourceName: "Wikimedia Commons",
  },
  {
    path: "/images/spots/omachi-06.jpg",
    subject: "居谷里湿原",
    title: "リュウキンカ@居谷里湿原",
    author: "wakaba-shinshu",
    license: "CC BY 2.0",
    licenseUrl: BY_2,
    sourceUrl: `${FLICKR}154568645@N04/34011672963`,
    sourceName: "Flickr",
  },
  {
    path: "/images/spots/omachi-07.jpg",
    subject: "中綱湖",
    title: "中綱湖 - panoramio.jpg",
    author: "くろふね",
    license: "CC BY 3.0",
    licenseUrl: BY_3,
    sourceUrl: `${COMMONS}%E4%B8%AD%E7%B6%B1%E6%B9%96_-_panoramio.jpg`,
    sourceName: "Wikimedia Commons",
  },
  {
    path: "/images/spots/omachi-08.jpg",
    subject: "鷹狩山",
    title: "Japan North Alps",
    author: "wakanmuri",
    license: "CC BY 2.0",
    licenseUrl: BY_2,
    sourceUrl: `${FLICKR}13217899@N08/3507257327`,
    sourceName: "Flickr",
  },
  {
    path: "/images/spots/ikeda-01.jpg",
    subject: "池田八幡神社",
    title: "池田八幡神社社殿.jpg",
    author: "At1973",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}%E6%B1%A0%E7%94%B0%E5%85%AB%E5%B9%A1%E7%A5%9E%E7%A4%BE%E7%A4%BE%E6%AE%BF.jpg`,
    sourceName: "Wikimedia Commons",
  },
  {
    path: "/images/spots/ikeda-04.jpg",
    subject: "夢農場",
    title: "桜@池田町 夢農場",
    author: "wakaba-shinshu",
    license: "CC BY 2.0",
    licenseUrl: BY_2,
    sourceUrl: `${FLICKR}154568645@N04/34840653796`,
    sourceName: "Flickr",
  },
  {
    path: "/images/spots/ikeda-05.jpg",
    subject: "花紋大雪渓",
    title: "Daisekkei Sake Brewing 1.jpg",
    author: "Qurren",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}Daisekkei_Sake_Brewing_1.jpg`,
    sourceName: "Wikimedia Commons",
  },
  {
    path: "/images/spots/azumino-02.jpg",
    subject: "ほりでーゆ〜四季の郷",
    title: "Holiday You Shikinosato.jpg",
    author: "Qurren",
    license: "CC BY-SA 3.0",
    licenseUrl: BY_SA_3,
    sourceUrl: `${COMMONS}Holiday_You_Shikinosato.jpg`,
    sourceName: "Wikimedia Commons",
  },
  {
    path: "/images/spots/azumino-04.jpg",
    subject: "貞享義民記念館",
    title: "Kinenkan.JPG",
    author: "小松宏彰",
    license: "パブリックドメイン",
    licenseUrl: null,
    sourceUrl: `${COMMONS}Kinenkan.JPG`,
    sourceName: "Wikimedia Commons",
  },
  {
    path: "/images/spots/azumino-06.jpg",
    subject: "御宝田遊水池",
    title: "御宝田遊水池.jpg",
    author: "アポロ2",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}%E5%BE%A1%E5%AE%9D%E7%94%B0%E9%81%8A%E6%B0%B4%E6%B1%A0.jpg`,
    sourceName: "Wikimedia Commons",
  },
  {
    path: "/images/spots/azumino-07.jpg",
    subject: "烏川渓谷緑地",
    title: "Karasu River view from Karasugawakeikokubashi-bridge.jpg",
    author: "Qurren",
    license: "CC BY-SA 3.0",
    licenseUrl: BY_SA_3,
    sourceUrl: `${COMMONS}Karasu_River_view_from_Karasugawakeikokubashi-bridge.jpg`,
    sourceName: "Wikimedia Commons",
  },
  {
    path: "/images/spots/matsumoto-01.jpg",
    subject: "松本市はかり資料館",
    title:
      "250425 Matsumoto City Hakari Museum Matsumoto Nagano pref Japan01s3.jpg",
    author: "663highland",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}250425_Matsumoto_City_Hakari_Museum_Matsumoto_Nagano_pref_Japan01s3.jpg`,
    sourceName: "Wikimedia Commons",
  },
  {
    path: "/images/spots/matsumoto-05.jpg",
    subject: "源智の井戸",
    title: "源智の井戸.jpg",
    author: "深志",
    license: "CC BY-SA 3.0",
    licenseUrl: BY_SA_3,
    sourceUrl: `${COMMONS}%E6%BA%90%E6%99%BA%E3%81%AE%E4%BA%95%E6%88%B8.jpg`,
    sourceName: "Wikimedia Commons",
  },
  {
    path: "/images/spots/matsumoto-06.jpg",
    subject: "馬場家住宅",
    title: "Babake house 2010.jpg",
    author: "Wiiii",
    license: "CC BY-SA 3.0",
    licenseUrl: BY_SA_3,
    sourceUrl: `${COMMONS}Babake_house_2010.jpg`,
    sourceName: "Wikimedia Commons",
  },
  {
    path: "/images/spots/matsumoto-07.jpg",
    subject: "弘法山古墳",
    title: "Koboyama Kofun zenkei.JPG",
    author: "Saigen Jiro",
    license: "CC0",
    licenseUrl: CC0,
    sourceUrl: `${COMMONS}Koboyama_Kofun_zenkei.JPG`,
    sourceName: "Wikimedia Commons",
  },
];
