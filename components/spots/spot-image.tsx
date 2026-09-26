"use client";

import { useState } from "react";
import Image, { getImageProps } from "next/image";
import { getCategory } from "@/lib/spots/categories";
import { isAiImagePath } from "@/lib/spots/image-kind";
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
 * AI で生成したイメージ画像（lib/spots/image-kind.ts）には、右下に「イメージ（AI で生成）」を重ねる（#146）。
 * 重ねるのが小さすぎる画像（経路のカードの 64px）は `showAiLabel={false}` にして、横の文字の中に AiImageBadge を置く。
 * Vercel の画像変換の無料枠（5,000回/月）を超えないよう、`sizes` に表示する幅を必ず指定する（#30）
 */
export function SpotImage({
  category,
  imagePath,
  sizes,
  alt = "",
  className,
  aiLabelClassName,
  showAiLabel = true,
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
  /** 「イメージ（AI で生成）」の表示の位置・大きさを変えるとき（詳細の大きい画像など） */
  aiLabelClassName?: string;
  /** AI の画像に「イメージ（AI で生成）」を重ねるか。横に AiImageBadge を置く場所では false */
  showAiLabel?: boolean;
}) {
  const meta = getCategory(category);
  // 読み込めなかった写真のパス（別のスポットに替わったら、また写真を試す）
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const showPhoto = isSpotImagePath(imagePath) && imagePath !== failedPath;

  // ルートは span にする（経路のカードでは button の中に置くので、phrasing content だけにする。flex で見た目は div と同じ）
  return (
    <span
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
      {showAiLabel && showPhoto && isAiImagePath(imagePath) && (
        <span
          className={cn(
            "absolute bottom-1 right-1 max-w-[calc(100%-0.5rem)] rounded bg-black/60 px-1 py-px text-right text-[10px] font-bold leading-tight text-white",
            aiLabelClassName,
          )}
        >
          <AiImageLabelText />
        </span>
      )}
    </span>
  );
}

/**
 * 「イメージ（AI で生成）」の文字。幅が足りないとき（カードの 96px の画像）は、途中の文字ではなく
 * 「イメージ」と「（AI で生成）」の間で折り返す（keep-all で日本語の途中の折り返しを止め、<wbr> だけで折り返す）
 */
function AiImageLabelText() {
  return (
    <span className="[word-break:keep-all]">
      イメージ
      <wbr />
      （AI&nbsp;で生成）
    </span>
  );
}

/** 画像の横の文字の中に置く「イメージ（AI で生成）」（経路のカードなど、画像が小さくて重ねられない場所）。AI の画像でなければ何も出さない */
export function AiImageBadge({
  imagePath,
}: {
  imagePath: string | null | undefined;
}) {
  if (!isSpotImagePath(imagePath) || !isAiImagePath(imagePath)) return null;
  return (
    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
      <AiImageLabelText />
    </span>
  );
}
