import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inbox, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { HiddenGemScore } from "@/components/spots/hidden-gem-score";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Rating } from "@/components/ui/rating";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES } from "@/lib/spots/categories";
import { ChipDemo } from "./chip-demo";
import { TEXT_PAIRS, brand, contrastRatio } from "./contrast";

export const metadata: Metadata = {
  title: "UI 部品の見本",
  robots: { index: false, follow: false },
};

// 色の値は tailwind.config.ts から読む
const BRAND_COLORS = [
  { name: "ink", hex: brand.ink.DEFAULT, note: "深緑（メイン）" },
  { name: "ink-light", hex: brand.ink.light, note: "ink の薄い背景" },
  { name: "shu", hex: brand.shu.DEFAULT, note: "朱色（アクセント）" },
  { name: "shu-light", hex: brand.shu.light, note: "shu の薄い背景" },
  { name: "shu-border", hex: brand.shu.border, note: "shu の枠線" },
  {
    name: "hero-from",
    hex: brand.hero.from,
    note: "ヒーローのグラデーション（始点）",
  },
  {
    name: "hero-via",
    hex: brand.hero.via,
    note: "ヒーローのグラデーション（中間）",
  },
  {
    name: "hero-to",
    hex: brand.hero.to,
    note: "ヒーローのグラデーション（終点。いちばん明るい）",
  },
];

/**
 * 共通 UI 部品の見本（開発者向け）。
 * 本番（Vercel の Production）では 404 にし、ローカルと Preview でだけ見られるようにする
 */
export default function UiCatalogPage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="text-xs font-bold text-shu">開発者向け</p>
        <h1 className="font-brand text-2xl font-bold text-ink">
          UI 部品の見本
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          共通部品の見た目と使い方の一覧。部品は{" "}
          <code className="rounded bg-stone-100 px-1">components/ui/</code>{" "}
          にある。shadcn/ui の部品は{" "}
          <code className="rounded bg-stone-100 px-1">
            npx shadcn@latest add &lt;name&gt;
          </code>{" "}
          で足す。本番では表示しない。
        </p>
      </header>

      <Section title="配色" file="tailwind.config.ts / app/globals.css">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {BRAND_COLORS.map((c) => (
            <div
              key={c.name}
              className="overflow-hidden rounded-xl border border-stone-200 bg-white"
            >
              <div className="h-14" style={{ backgroundColor: c.hex }} />
              <div className="p-2">
                <p className="text-sm font-bold text-stone-900">{c.name}</p>
                <p className="text-xs text-stone-600">
                  {c.hex} ・ {c.note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="文字" file="app/layout.tsx">
        <div className="flex flex-col gap-2">
          <p className="font-brand text-2xl font-bold text-ink">
            見出し（font-brand = Zen Maru Gothic）
          </p>
          <p className="text-base text-stone-900">
            本文（Noto Sans JP）。地元の人が教える穴場スポット。
          </p>
          <p className="text-sm text-stone-600">説明文（text-sm stone-600）</p>
          <p className="text-xs text-stone-500">
            補足の小さい文字（text-xs stone-500）。stone-400 は白地で 2.5:1
            しかないので文字には使わない
          </p>
        </div>
      </Section>

      <Section
        title="星評価 Rating"
        file="components/ui/rating.tsx"
        usage='<Rating value={spot.rating} />  // null なら何も出さない。size="md"・showValue={false} も使える'
      >
        <div className="flex flex-col gap-3">
          {[5, 4.3, 3.5, 2.8, 1, 0].map((v) => (
            <div
              key={v}
              className="flex flex-wrap items-center gap-x-6 gap-y-1"
            >
              <Rating value={v} />
              <Rating value={v} size="md" />
              <Rating value={v} showValue={false} />
            </div>
          ))}
          <p className="text-xs text-stone-600">
            value が null のとき:「
            <Rating value={null} />
            」（何も表示しない）
          </p>
        </div>
      </Section>

      <Section
        title="穴場度 HiddenGemScore"
        file="components/spots/hidden-gem-score.tsx"
        usage="<HiddenGemScore score={getHiddenGemScore(spot)} />  // null なら何も出さない"
      >
        <div className="flex flex-col gap-3">
          {([5, 4, 3, 2, 1] as const).map((v) => (
            <HiddenGemScore key={v} score={v} />
          ))}
          <p className="text-xs text-stone-600">
            score が null のとき:「
            <HiddenGemScore score={null} />
            」（何も表示しない）
          </p>
        </div>
      </Section>

      <Section
        title="チップ Chip"
        file="components/ui/chip.tsx"
        usage="<Chip active={selected} onClick={toggle}>グルメ</Chip>"
      >
        <ChipDemo />
      </Section>

      <Section title="ボタン Button" file="components/ui/button.tsx">
        <div className="flex flex-wrap items-center gap-2">
          <Button>
            <Plus />
            メイン
          </Button>
          <Button variant="secondary">サブ</Button>
          <Button variant="outline">枠線</Button>
          <Button variant="ghost">ゴースト</Button>
          <Button variant="link">リンク</Button>
          <Button variant="destructive">
            <Trash2 />
            削除
          </Button>
          <Button size="sm">小</Button>
          <Button disabled>無効</Button>
        </div>
      </Section>

      <Section
        title="バッジ Badge・カテゴリ"
        file="components/ui/badge.tsx / lib/spots/categories.ts"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge>default</Badge>
          <Badge variant="secondary">secondary</Badge>
          <Badge variant="outline">outline</Badge>
          <Badge variant="destructive">destructive</Badge>
          {Object.values(CATEGORIES).map((c) => (
            <span
              key={c.label}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${c.badge}`}
            >
              <c.icon aria-hidden className="h-3 w-3" />
              {c.label}
            </span>
          ))}
        </div>
      </Section>

      <Section title="カード Card" file="components/ui/card.tsx">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>カードの見出し</CardTitle>
            <CardDescription>説明文（muted-foreground）</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">本文</CardContent>
        </Card>
      </Section>

      <Section
        title="フォーム Input・Label・Checkbox"
        file="components/ui/input.tsx ほか"
      >
        <div className="flex max-w-sm flex-col gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="demo-input">メールアドレス</Label>
            <Input id="demo-input" placeholder="m@example.com" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="demo-check" />
            <Label htmlFor="demo-check">利用規約に同意する</Label>
          </div>
        </div>
      </Section>

      <Section
        title="スケルトン Skeleton"
        file="components/ui/skeleton.tsx"
        usage='<Skeleton className="h-[122px] rounded-2xl" />'
      >
        <div className="flex max-w-md gap-3 rounded-2xl border border-stone-200 bg-white p-3">
          <Skeleton className="h-24 w-24 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </Section>

      <Section
        title="空状態 EmptyState"
        file="components/empty-state.tsx"
        usage='<EmptyState icon={Inbox} title="…" description="…" />'
      >
        <EmptyState
          icon={Inbox}
          title="まだスポットがありません"
          description="地域を選ぶと、地元の人が教える穴場がここに並びます。"
          className="max-w-md"
        />
      </Section>

      <Section
        title="コントラスト比（WCAG AA: 4.5:1 以上）"
        file="app/dev/ui/contrast.ts"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs text-stone-600">
              <tr>
                <th className="py-2 pr-3 font-semibold">見本</th>
                <th className="py-2 pr-3 font-semibold">使いどころ</th>
                <th className="py-2 pr-3 font-semibold">文字 / 背景</th>
                <th className="py-2 font-semibold">比</th>
              </tr>
            </thead>
            <tbody>
              {TEXT_PAIRS.map((p) => {
                const ratio = contrastRatio(p.fg, p.bg);
                // 色が読めず NaN になったときも ✕ にする
                const ok = ratio >= 4.5;
                return (
                  <tr key={p.usage} className="border-t border-stone-200">
                    <td className="py-2 pr-3">
                      <span
                        className="whitespace-nowrap rounded px-2 py-1 text-xs font-bold"
                        style={{ color: p.fg, backgroundColor: p.bg }}
                      >
                        あア Aa
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-stone-900">{p.usage}</td>
                    <td className="py-2 pr-3 text-xs text-stone-600">
                      {p.fgName} / {p.bgName}
                    </td>
                    <td
                      className={`py-2 font-bold ${ok ? "text-stone-900" : "text-destructive"}`}
                    >
                      {ratio.toFixed(2)}
                      {!ok && " ✕"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  file,
  usage,
  children,
}: {
  title: string;
  file: string;
  usage?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-brand text-lg font-bold text-ink">{title}</h2>
        <p className="text-xs text-stone-600">{file}</p>
        {usage && (
          <pre className="mt-1 overflow-x-auto rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-700">
            <code>{usage}</code>
          </pre>
        )}
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        {children}
      </div>
    </section>
  );
}
