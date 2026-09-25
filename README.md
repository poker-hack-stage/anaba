# HACK STAGE Product

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
  map/                地図（spot-map.tsx。今は簡易表示で、Leaflet に差し替える）
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
4. PR を作成 → CI（lint / format / typecheck / test / build）が通り、CodeRabbit のレビューの指摘に対応したら、自分で `main` にマージする（Merge commit）
5. PR ごとに Vercel の Preview URL が発行され、`main` へのマージで本番デプロイされる

`main` はブランチ保護で、直接 push できず、CI（ジョブ `check`）が通らない PR はマージできない。人のレビューは必須にしていない（見てほしい PR は、レビューを頼んでからマージする）。

### 公開リポジトリでの注意

このリポジトリは public なので、コミット・Issue・PR・コメントは誰でも読める。

- API キー・`.env.local` の中身・パスワードは、コミットしない。Issue・PR・コメントにも貼らない（ログやスクリーンショットに写り込んだものも同じ）
- うっかり貼ったりコミットしたりしたら、消すだけでは足りない（履歴やキャッシュに残る）。すぐにそのキーを無効にして作り直し、チームに伝える
- `main` へのマージは本番デプロイになる（#25）。動作確認していないものはマージしない

### DB を変更するとき

Studio の GUI で直接テーブルを作らず、**必ずマイグレーションで管理する**（他のメンバーの環境と本番に反映できなくなるため）。

```bash
npm run db:new add_posts          # supabase/migrations/<timestamp>_add_posts.sql ができる
# SQL を書く（テーブルを作ったら RLS を有効化してポリシーを書くこと）
npm run db:reset                  # ローカルに適用して確認
npm run db:types                  # 型を再生成してコミット
```

他の人のマイグレーションを pull したら `npm run db:reset` で取り込む。

本番 DB への反映（担当者のみ）:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

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

## 注意

- `.env.local` はコミットしない
- `SECRET_KEY`（service_role）はクライアントに絶対出さない。使う場合は `NEXT_PUBLIC_` を付けずサーバー側のみで使う
- 新しいテーブルは必ず RLS を有効化する

## 実装の約束ごと

- `next.config.ts` で Cache Components が有効。cookie や DB を読むコンポーネントは `<Suspense>` の内側に置く（外に置くとビルドエラーになる）
- 未実装の箇所には `TODO(#番号)` コメントを付けている（番号は `docs/issues.md` のイシュー）
- ログイン機能はない（#3 で決定、#37 で削除）。投稿・口コミはログインなしの匿名（ニックネームだけ）で受け付ける。DB の読み取りは匿名キー（publishable key）で行う
