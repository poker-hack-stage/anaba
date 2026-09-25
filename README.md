# anaba

Next.js (App Router) + Supabase + Vercel

## 技術スタック

| 用途           | 技術                                          |
| -------------- | --------------------------------------------- |
| フロント / API | Next.js 16 (App Router), React 19, TypeScript |
| UI             | Tailwind CSS, shadcn/ui                       |
| DB             | Supabase (Postgres)                           |
| ホスティング   | Vercel                                        |

## セットアップ

必要なもの: Node.js 22（22.13 以上、`.nvmrc`）、Docker Desktop

```bash
npm install
cp .env.example .env.local
npm run db:start        # ローカル Supabase 起動（初回はイメージ取得で数分かかる）
```

`db:start` の出力にある `PUBLISHABLE_KEY` を `.env.local` の `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` に貼る。

AI旅プランで Gemini を使うときは、`.env.local` に次を書く（なくてもアプリは動き、旅プランはデモモードになる）。無料枠で送った内容は Google のサービス改善に使われるので、個人情報は送らない。

Gemini API のキーの決まり:

- **各自で作り、共有しない。** 無料枠の上限はプロジェクトごとにかかるので、1本を共有すると上限を取り合う。[Google AI Studio](https://aistudio.google.com/apikey) で作る
- **支払い情報の付いていない新しいプロジェクトで作る。** 請求先アカウントの付いたプロジェクトのキーは有料の扱いになり、料金がかかる
- アカウントの都合（年齢の条件や、学校・会社のアカウントの制限）で作れない人は、キーなし（デモモード）で開発する
- 本番（Vercel）のキーは、Vercel の持ち主（#4）が本番用に別に作り、Vercel の環境変数だけに入れる。開発では使わない

| 環境変数         | 内容                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY` | Gemini API のキー。サーバー側だけで使う（`NEXT_PUBLIC_` を付けない）                                                                                                 |
| `GEMINI_MODEL`   | 使うモデル。空なら既定の `gemini-3.5-flash-lite`（無料枠は1分15回・1日500回）。質を比べたいときは `gemini-3.8-flash`（無料枠は1日20回）。上限は AI Studio で確かめる |

```bash
npm run dev             # http://localhost:3000
```

| URL                    | 内容                                |
| ---------------------- | ----------------------------------- |
| http://localhost:3000  | アプリ                              |
| http://127.0.0.1:54323 | Supabase Studio（DB を GUI で見る） |

## スクリプト

| コマンド                          | 内容                                                         |
| --------------------------------- | ------------------------------------------------------------ |
| `npm run dev`                     | 開発サーバー                                                 |
| `npm run lint` / `lint:fix`       | ESLint                                                       |
| `npm run format` / `format:check` | Prettier                                                     |
| `npm run typecheck`               | 型チェック                                                   |
| `npm test` / `npm run test:watch` | テスト（Vitest）を1回実行 / 変更を監視して再実行             |
| `npm run db:start` / `db:stop`    | ローカル Supabase 起動 / 停止                                |
| `npm run db:new <名前>`           | マイグレーションファイル作成                                 |
| `npm run db:reset`                | ローカル DB を作り直し（全マイグレーション + seed を再適用） |
| `npm run db:types`                | DB スキーマから `lib/supabase/database.types.ts` を生成      |

## ディレクトリ構成

```
app/                  ルーティング（ページ・Route Handler）
  page.tsx            穴場を探す（トップ）
  planner/            AI旅プラン
  api/plan/           旅プランの候補を返す API（Gemini で作り、作れなければデモモード）
  dev/ui/             UI 部品の見本（開発者向け。Vercel の Production では 404）
components/           共通コンポーネント
  layout/             ヘッダー・タブ・下部ナビ・フッター（タブは nav-items.ts で管理）
  discover/           穴場を探す：地域の自動切り替え（地図＋情報パネル）
  map/                地図（spot-map.tsx。Leaflet ＋ 地理院タイル。使う側は next/dynamic の ssr: false で読み込む）
  spots/              スポットカード・スポット詳細（両タブ共通）
  planner/            旅プランの条件フォーム・候補カード
  ui/                 shadcn/ui（`npx shadcn@latest add <name>` で追加。生成された `import { cn } from "cn"` は
                      `@/lib/utils` に直し、package.json に入った `cn` は消す）
lib/
  ai/gemini.ts        Gemini API の呼び出し（サーバー専用。Gemini を呼ぶのはここだけ）
  data/               DB 読み取り関数（ページからはここを呼ぶ）
  spots/categories.ts スポットのカテゴリ定義（色・絵文字）。テストは隣の categories.test.ts
  planner/            旅プランの型と候補の生成。create-plan.ts が入口（Gemini: ai-prompt.ts・ai-candidates.ts、デモモード: generate.ts、入力の検証: schema.ts）
lib/supabase/         Supabase クライアント
  server.ts           Server Component / Server Action / Route Handler 用
  client.ts           Client Component 用
  database.types.ts   自動生成（手で編集しない）
supabase/
  migrations/         DB スキーマ変更（SQL）
  seed.sql            ローカル用初期データ
test/                 テストの共通設定（setup.ts）・モック（mocks/）・フィクスチャ（fixtures/）
vitest.config.mts     Vitest の設定
```

## 開発フロー

1. Issue を立てる（またはアサインされる）
2. `main` からブランチを切る: `feat/xxx`, `fix/xxx`, `chore/xxx`
3. 実装してコミット（例: `feat: 口コミの投稿フォームを追加`）
4. PR を作成 → CI（lint / format / typecheck / test / build）が通ること、1 人以上のレビューで `main` にマージ
5. PR ごとに Vercel の Preview URL が発行され、`main` へのマージで本番デプロイされる

`main` への直 push は禁止（GitHub の Branch protection で設定推奨）。

### DB を変更するとき

Studio の GUI で直接テーブルを作らず、**必ずマイグレーションで管理する**（他のメンバーの環境と本番に反映できなくなるため）。

```bash
npm run db:new add_posts          # supabase/migrations/<timestamp>_add_posts.sql ができる
# SQL を書く（テーブルを作ったら RLS を有効化してポリシーを書くこと）
npm run db:reset                  # ローカルに適用して確認
npm run db:types                  # 型を再生成してコミット
```

他の人のマイグレーションを pull したら `npm run db:reset` で取り込む。

### 本番の Supabase（担当者のみ）

本番（と Vercel の Preview）は、クラウドの Supabase プロジェクト1つを使う。開発はローカルの Supabase で行う。

| 項目         | 内容                                                                         |
| ------------ | ---------------------------------------------------------------------------- |
| 持ち主       | hayato-psg（Organization の Owner）                                          |
| メンバー     | GitHub の poker-hack-stage Organization のメンバー全員                       |
| プロジェクト | HACK-STAGE（ref: `keiqxofwbvvreowgihjx`、リージョン: 東京 `ap-northeast-1`） |
| プラン       | Free。自動バックアップはなく、1週間アクセスがないと一時停止する              |

バックアップがないので、`supabase/migrations/` と `supabase/seed.sql` からいつでも作り直せるようにしておく。本番のテーブルやデータを Studio で直接変えない。

最初に一度だけ:

```bash
npx supabase login
npx supabase link --project-ref keiqxofwbvvreowgihjx   # DB のパスワードを聞かれる
```

| 場面                                | やること                                                    |
| ----------------------------------- | ----------------------------------------------------------- |
| 空のプロジェクトに作る・作り直す    | `npx supabase db push --include-seed`                       |
| マイグレーションが増えた            | `npx supabase db push`                                      |
| `seed.sql` のデータを足した・直した | `seed.sql` の中身をダッシュボードの SQL Editor に貼って Run |
| `seed.sql` から行を消した           | 本番でも SQL Editor で `delete` を流す                      |

- `db push` の前に `--dry-run` を付けて、何が流れるかを確かめる
- `--include-seed` はシードを初回しか流さない（2回目以降は記録を更新するだけ）。なので、データの更新は SQL Editor で流す
- 一時停止したら、ダッシュボードでプロジェクトを開いて Restore する
- アプリで使うのは Project URL と Publishable key だけ（Vercel の環境変数に入れる。#4）。Secret key（service_role）は使わず、リポジトリにも `NEXT_PUBLIC_` の環境変数にも入れない

### テストを書くとき

Vitest + React Testing Library（`jsdom`）。設定は `vitest.config.mts`、見本は `lib/spots/categories.test.ts`。

- **置き場所と命名**: 対象ファイルの隣に `<ファイル名>.test.ts`（コンポーネントなら `.test.tsx`）を置く。例: `lib/spots/categories.ts` → `lib/spots/categories.test.ts`
- **書く対象**
  - `lib/` の関数: Vitest で書く
  - クライアントコンポーネント（`"use client"`）: Testing Library で描画して確かめる
  - async の Server Component: Vitest では描画できないので、中のロジックを `lib/` の関数に切り出してその関数をテストする
- **外部サービスは呼ばない**: Supabase と Gemini API はテストから呼ばない。フィクスチャ（`supabase/seed.sql` 相当のデータを TS で書いたもの）や `vi.mock()` で差し替える
- `import "server-only"` を含むファイルもテストで読み込める（`vitest.config.mts` で空のモジュールに差し替えている）
- `describe` / `expect` / `test` などはグローバルにせず、各ファイルで `import { describe, expect, test } from "vitest"` する

## デプロイ（Vercel）

1. Vercel で GitHub リポジトリをインポート（リポジトリ直下でない場合は **Root Directory** にこのディレクトリを指定）
2. Environment Variables に以下を設定
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `GEMINI_API_KEY`・`GEMINI_MODEL`（任意。空なら既定の `gemini-3.5-flash-lite`）

## 地図タイル

地図（`components/map/spot-map.tsx`）は [Leaflet](https://leafletjs.com/)（react-leaflet）で描き、背景に**国土地理院の地理院タイル（淡色地図）**を使っている。

| 項目       | 内容                                                                                                                                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL        | `https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png`（ズーム 5〜18、日本国内のみ）                                                                                                                                   |
| 申請       | 不要。ウェブ上でタイルをその場で読み込んで表示する使い方は、出典を明示すれば申請なしで使える（[地理院タイル一覧](https://maps.gsi.go.jp/development/ichiran.html)）                                                         |
| 本番・商用 | [国土地理院コンテンツ利用規約](https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html)（公共データ利用規約 PDL1.0 準拠）に従い、出典を記載すれば商用でも使える。アクセス数の上限は書かれていない（2026-09 時点で確認） |
| 帰属表示   | 「地理院タイル」と書き、地理院タイル一覧ページへリンクする。地図の右下に Leaflet の帰属表示として常に出している（消さない・隠さない）                                                                                       |
| 控えること | 規約に明記はないが、国の無償サービスで SLA もないため、タイルの一括ダウンロードや事前の大量取得はしない                                                                                                                     |

OpenStreetMap の標準タイル（`tile.openstreetmap.org`）に替える場合の注意:

- 帰属表示「© OpenStreetMap contributors」を地図上に常に出す
- [タイル利用ポリシー](https://operations.osmfoundation.org/policies/tiles/)で、大量のアクセスや一括ダウンロードは禁止。SLA はなく、使いすぎると予告なく遮断されることがある。本番で利用者が増えるなら、有料のタイル配信サービスか自前のタイルサーバーを使う

## 注意

- `.env.local` はコミットしない
- `SECRET_KEY`（service_role）はクライアントに絶対出さない。使う場合は `NEXT_PUBLIC_` を付けずサーバー側のみで使う
- 新しいテーブルは必ず RLS を有効化する

## 実装の約束ごと

- `next.config.ts` で Cache Components が有効。cookie や DB を読むコンポーネントは `<Suspense>` の内側に置く（外に置くとビルドエラーになる）
- 未実装の箇所には `TODO(#番号)` コメントを付けている（番号は GitHub の Issue）
- ログイン機能はない（#3 で決定、#37 で削除）。投稿・口コミはログインなしの匿名（ニックネームだけ）で受け付ける。DB の読み取りは匿名キー（publishable key）で行う
