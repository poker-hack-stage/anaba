// スポットの画像の種類（#146）。写真のないスポットには AI で生成したイメージ画像を使い、画面で「イメージ（AI で生成）」と示す。
// 画面（カード・詳細・経路のカード）は lib/photo-credits.ts の一覧を読まずにパスだけで分けられるよう、AI の画像は決まったフォルダに置く

/** AI で生成したイメージ画像を置くフォルダ（public/ からのパス）。lib/photo-credits.ts の kind: "ai" の画像はすべてここに置く */
export const AI_IMAGE_DIR = "/images/spots/ai/";

/** AI の画像に添える表示 */
export const AI_IMAGE_LABEL = "イメージ（AI で生成）";

/** `image_path` が AI で生成したイメージ画像か */
export function isAiImagePath(imagePath: string | null | undefined): boolean {
  return !!imagePath && imagePath.startsWith(AI_IMAGE_DIR);
}
