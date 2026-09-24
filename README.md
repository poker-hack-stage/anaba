# HACK STAGE Product

Next.js (App Router) + Supabase + Vercel

## 技術スタック

| 用途           | 技術                                          |
| -------------- | --------------------------------------------- |
| フロント / API | Next.js 16 (App Router), React 19, TypeScript |
| UI             | Tailwind CSS, shadcn/ui                       |
| DB / 認証      | Supabase (Postgres, Auth)                     |
| ホスティング   | Vercel                                        |

## セットアップ

必要なもの: Node.js 22（`.nvmrc`）、Docker Desktop

```bash
npm install
cp .env.example .env.local
npm run db:start        # ローカル Supabase 起動（初回はイメージ取得で数分かかる）
```

`db:start` の出力にある `PUBLISHABLE_KEY` を `.env.local` の `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` に貼る。

```bash
npm run dev             # http://localhost:3000
```

| URL                    | 内容                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| http://localhost:3000  | アプリ                                                                                        |
| http://127.0.0.1:54323 | Supabase Studio（DB を GUI で見る）                                                           |
| http://127.0.0.1:54324 | Mailpit（パスワードリセット等のメールはここに届く。ローカルではメール確認なしで即ログイン可） |

## スクリプト

| コマンド                          | 内容                                                         |
| --------------------------------- | ------------------------------------------------------------ |
| `npm run dev`                     | 開発サーバー                                                 |
| `npm run lint` / `lint:fix`       | ESLint                                                       |
| `npm run format` / `format:check` | Prettier                                                     |
| `npm run typecheck`               | 型チェック                                                   |
| `npm test` / `test:watch`         | テスト（Vitest）を1回実行 / 変更を監視して再実行             |
| `npm run db:start` / `db:stop`    | ローカル Supabase 起動 / 停止                                |
| `npm run db:new <名前>`           | マイグレーションファイル作成                                 |
| `npm run db:reset`                | ローカル DB を作り直し（全マイグレーション + seed を再適用） |
| `npm run db:types`                | DB スキーマから `lib/supabase/database.types.ts` を生成      |

## ディレクトリ構成

```
app/                  ルーティング（ページ・Route Handler）
  page.tsx            穴場を探す（トップ）
  planner/            AI旅プラン
  api/plan/           旅プランの候補を返す API（今は仮実装。Claude API に差し替える）
  auth/               ログイン・サインアップ等（スターター由来）
components/           共通コンポーネント
  layout/             ヘッダー・タブ・下部ナビ・フッター（タブは nav-items.ts で管理）
  discover/           穴場を探す：地域の自動切り替え（地図＋情報パネル）
  map/                地図（spot-map.tsx。今は簡易表示で、Leaflet に差し替える）
  spots/              スポットカード・スポット詳細（両タブ共通）
  planner/            旅プランの条件フォーム・候補カード
  ui/                 shadcn/ui（`npx shadcn@latest add <name>` で追加）
lib/
  auth.ts             ログイン中ユーザーの取得
  data/               DB 読み取り関数（ページからはここを呼ぶ）
  spots/categories.ts スポットのカテゴリ定義（色・絵文字）。テストは隣の categories.test.ts
  planner/            旅プランの型と候補の生成（generate.ts が仮実装）
lib/supabase/         Supabase クライアント
  server.ts           Server Component / Server Action / Route Handler 用
  client.ts           Client Component 用
  proxy.ts            セッション更新・未ログイン時のリダイレクト
  database.types.ts   自動生成（手で編集しない）
supabase/
  migrations/         DB スキーマ変更（SQL）
  seed.sql            ローカル用初期データ
proxy.ts              Next.js Proxy（旧 middleware）
test/                 テストの共通設定（setup.ts）とモック（mocks/）
vitest.config.mts     Vitest の設定
```

## 開発フロー

1. Issue を立てる（またはアサインされる）
2. `main` からブランチを切る: `feat/xxx`, `fix/xxx`, `chore/xxx`
3. 実装してコミット（例: `feat: プロフィール編集画面を追加`）
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
- **外部サービスは呼ばない**: Supabase と Claude API はテストから呼ばない。フィクスチャ（`supabase/seed.sql` 相当のデータを TS で書いたもの）や `vi.mock()` で差し替える
- `import "server-only"` を含むファイルもテストで読み込める（`vitest.config.mts` で空のモジュールに差し替えている）
- `describe` / `expect` / `test` などはグローバルにせず、各ファイルで `import { describe, expect, test } from "vitest"` する

## デプロイ（Vercel）

1. Vercel で GitHub リポジトリをインポート（リポジトリ直下でない場合は **Root Directory** にこのディレクトリを指定）
2. Environment Variables に以下を設定
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Supabase ダッシュボード > Authentication > URL Configuration
   - Site URL: 本番 URL
   - Redirect URLs: `https://<本番ドメイン>/**` と Preview 用 `https://*-<vercel-team>.vercel.app/**`

## 注意

- `.env.local` はコミットしない
- `SECRET_KEY`（service_role）はクライアントに絶対出さない。使う場合は `NEXT_PUBLIC_` を付けずサーバー側のみで使う
- 新しいテーブルは必ず RLS を有効化する

## 実装の約束ごと

- `next.config.ts` で Cache Components が有効。cookie（ログイン状態）や DB を読むコンポーネントは `<Suspense>` の内側に置く（外に置くとビルドエラーになる）
- 未実装の箇所には `TODO(#番号)` コメントを付けている（番号は `docs/issues.md` のイシュー）
- ログイン必須のページを増やしたら `lib/supabase/proxy.ts` の `protectedPaths` に追加する
- Server Action の中でも必ず `getCurrentUser()` でログインを確認する
