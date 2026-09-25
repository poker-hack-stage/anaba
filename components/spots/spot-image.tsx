"use client";

import { useState } from "react";
import Image, { getImageProps } from "next/image";
import { getCategory } from "@/lib/spots/categories";
import { cn } from "@/lib/utils";

/**
 * `image_path` が写真として出せるパスか。写真は `public/images/spots/` に置き、`image_path` には
 * `/images/spots/xxx.jpg` のような `public/` からのパスを入れる（docs/image-credits.md・#30）。
 * `/` で始まらない値（外部の URL など）は next.config の許可が要るので、出さずにプレースホルダーにする
 */
export function isSpotImagePath(
  imagePath: string | null | undefined,
): imagePath is string {
  return (
    !!imagePath && imagePath.startsWith("/") && !imagePath.startsWith("//")
  );
}

/**
 * 写真を先に読み込んでおく（地域が切り替わる前に、次の地域の写真を読んでおくため）。
 * `sizes` は表示する SpotImage と同じ値にする（next/image と同じ URL を読ませるため）
 */
export function preloadSpotImage(
  imagePath: string | null | undefined,
  sizes: string,
) {
  if (!isSpotImagePath(imagePath)) return;
  const { props } = getImageProps({
    src: imagePath,
    alt: "",
    fill: true,
    sizes,
  });
  // next/image の Image と名前がぶつかるので、ブラウザの Image は window から取る
  const img = new window.Image();
  // srcset と sizes を先に入れてから src を入れる（src を先に入れると、src の URL も読んでしまう）
  if (props.sizes) img.sizes = props.sizes;
  if (props.srcSet) img.srcset = props.srcSet;
  img.src = props.src;
}

/**
 * スポットの写真。`imagePath` があれば写真を、なければカテゴリ色のプレースホルダーを出す。
 * 写真はプレースホルダーの上に重ねるので、読み込み中や読み込めなかったときもプレースホルダーが見える。
 * Vercel の画像変換の無料枠（5,000回/月）を超えないよう、`sizes` に表示する幅を必ず指定する（#30）
 */
export function SpotImage({
  category,
  imagePath,
  sizes,
  alt = "",
  className,
}: {
  category: string;
  imagePath?: string | null;
  /**
   * next/image の sizes。写真の表示幅（例: "96px"）。`imagePath` を渡すときは必ず指定する
   * （省くと next/image の既定の 100vw になり、大きい画像まで変換されて無料枠を使う）
   */
  sizes?: string;
  /** 写真の代替テキスト。横に名前を出している場所では空のままにする */
  alt?: string;
  className?: string;
}) {
  const meta = getCategory(category);
  // 読み込めなかった写真のパス（別のスポットに替わったら、また写真を試す）
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const showPhoto = isSpotImagePath(imagePath) && imagePath !== failedPath;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden text-4xl",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, ${meta.color}33, ${meta.color}88)`,
      }}
    >
      {/* アイコンの大きさは文字の大きさ（text-4xl など）に合わせる */}
      <meta.icon
        aria-hidden
        className="h-[1em] w-[1em]"
        style={{ color: meta.color }}
        strokeWidth={1.5}
      />
      {showPhoto && (
        <Image
          src={imagePath}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
          onError={() => setFailedPath(imagePath)}
        />
      )}
    </div>
  );
}
