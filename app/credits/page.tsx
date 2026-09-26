import type { Metadata } from "next";
import {
  AI_IMAGE_CREDITS,
  PHOTO_CHANGES,
  PHOTO_CREDITS,
} from "@/lib/photo-credits";
import { AI_IMAGE_LABEL } from "@/lib/spots/image-kind";

export const metadata: Metadata = {
  title: "写真の出典",
};

// 写真の出典（#67）。CC BY・CC BY-SA の写真は、撮影者とライセンスを見る人に示すことが条件なので、フッターからここへリンクする。
// AI で生成したイメージ画像は、生成に使ったモデルとプロンプトの要旨を出す（#146）
export default function CreditsPage() {
  const sourceNames = [...new Set(PHOTO_CREDITS.map((c) => c.sourceName))];
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-brand text-2xl font-bold text-stone-900">
        写真の出典
      </h1>
      <p className="text-sm leading-relaxed text-stone-600">
        スポットの写真は、{sourceNames.join("・")}
        で公開されている、ライセンスがはっきりした写真を使っています。どの写真も、
        {PHOTO_CHANGES}
        ものです。
        {AI_IMAGE_CREDITS.length > 0
          ? `許可のいらない写真が見つからなかったスポットは、AI で生成したイメージ画像を使い、画像に「${AI_IMAGE_LABEL}」と表示しています。実在の建物や看板を写したものではありません。`
          : "写真のないスポットは、カテゴリのイラストを表示しています。"}
      </p>
      <ul className="flex flex-col divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
        {PHOTO_CREDITS.map((credit) => (
          <li key={credit.path} className="px-4 py-3 text-sm">
            <p className="font-bold text-stone-900">{credit.subject}</p>
            <p className="mt-0.5 break-words text-stone-600">
              元の写真:{" "}
              <a
                href={credit.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-shu"
              >
                「{credit.title}」
              </a>
              （{credit.sourceName}）
            </p>
            <p className="mt-0.5 text-stone-600">
              撮影: {credit.author} ／{" "}
              {credit.licenseUrl ? (
                <a
                  href={credit.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-shu"
                >
                  {credit.license}
                </a>
              ) : (
                credit.license
              )}
            </p>
          </li>
        ))}
      </ul>
      {AI_IMAGE_CREDITS.length > 0 && (
        <>
          <h2 className="mt-4 font-brand text-xl font-bold text-stone-900">
            AI で生成したイメージ画像
          </h2>
          <ul className="flex flex-col divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
            {AI_IMAGE_CREDITS.map((credit) => (
              <li key={credit.path} className="px-4 py-3 text-sm">
                <p className="font-bold text-stone-900">{credit.subject}</p>
                <p className="mt-0.5 text-stone-600">
                  {AI_IMAGE_LABEL} ／ モデル: {credit.model}（{credit.createdOn}
                  に生成）
                </p>
                <p className="mt-0.5 break-words text-stone-600">
                  プロンプトの要旨: {credit.prompt}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
