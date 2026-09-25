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

口コミ・スポットの投稿（#52）のレート制限に使う値:

| 環境変数          | 内容                                                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RATE_LIMIT_SALT` | 送信元の IP と一緒にハッシュにする秘密の値。サーバー側だけで使う（`NEXT_PUBLIC_` を付けない）。開発では空でよい（固定の開発用の値を使う）。本番では必須で、空だと投稿を受け付けず（503）、旅プランは Gemini を使わずデモモードになる |

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
  api/spots/[id]/reviews/  口コミの一覧（GET）と投稿（POST）の API
  api/spot-submissions/    スポットの投稿（穴場を教える）の API
  dev/ui/             UI 部品の見本（開発者向け。Vercel の Production では 404）
components/           共通コンポーネント
  layout/             ヘッダー・タブ・下部ナビ・フッター（タブは nav-items.ts で管理）
  discover/           穴場を探す：地域の自動切り替え（地図＋情報パネル）
  map/                地図（spot-map.tsx。MapLibre ＋ OpenFreeMap。使う側は next/dynamic の ssr: false で読み込む）
  spots/              スポットカード・スポット詳細（両タブ共通）
  planner/            旅プランの条件フォーム・候補カード
  ui/                 shadcn/ui（`npx shadcn@latest add <name>` で追加。生成された `import { cn } from "cn"` は
                      `@/lib/utils` に直し、package.json に入った `cn` は消す）
lib/
  ai/gemini.ts        Gemini API の呼び出し（サーバー専用。Gemini を呼ぶのはここだけ）
  data/               DB 読み取り関数（ページからはここを呼ぶ）
  spots/categories.ts スポットのカテゴリ定義（色・絵文字）。テストは隣の categories.test.ts
  community/          口コミ・スポットの投稿の API の中身（入力の検証: schema.ts、DB のエラーの変換: errors.ts、
                      送信元のハッシュ: client-hash.ts、レート制限: write.ts、口コミの読み出し: reviews.ts）
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
   - `RATE_LIMIT_SALT`（必須。Production と Preview の両方に入れる。空だと口コミ・スポットの投稿が 503 になり、旅プランは Gemini を使わずデモモードになる。`openssl rand -hex 32` などで作り、変えると同じ送信元の数え直しになる）
3. Install Command と Build Command は既定（`npm install` / `npm run build`）のまま使う。地図のワーカーを install のあと（`postinstall`）に写すため、`--ignore-scripts` を付けない（詳しくは「地図タイル」）

## 地図タイル

地図（`components/map/spot-map.tsx`）は [MapLibre GL JS](https://maplibre.org/)（ベクトル地図）で描き、背景に **[OpenFreeMap](https://openfreemap.org/) の Bright スタイル**を使っている。

| 項目       | 内容                                                                                                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| スタイル   | `https://tiles.openfreemap.org/styles/bright`（地図のデータは OpenStreetMap。世界中を表示できる）                                                                                                                                      |
| 申請・料金 | 不要。登録・API キー・cookie なし。公開インスタンスは表示回数・リクエスト数の上限なしで無料、商用利用も可（[公式サイト](https://openfreemap.org/)。2026-09 時点で確認）                                                                |
| 利用規約   | [Terms of Service](https://openfreemap.org/tos/)。**サイトやアプリに組み込む人（開発者）は 18 歳以上**であること（地図を見るだけの利用者には年齢の条件はない）。保証なし・予告なく終了することがある                                   |
| 帰属表示   | 「OpenFreeMap © OpenMapTiles Data from OpenStreetMap」。スタイルに含まれていて、MapLibre が地図の右下に自動で出す（消さない・隠さない）。幅の狭い地図では、読み込みの数秒後か地図を動かすと「i」ボタンにたたまれる（押すと全文が出る） |
| 控えること | SLA がなく寄付で運営されているため、タイルの一括ダウンロードや事前の大量取得はしない（規約でも許可なく自動で集めることを禁止している）。本番で利用者が増えるなら自前のタイルサーバーも検討する                                         |

MapLibre の Web Worker（`maplibre-gl-worker.mjs`）はバンドラーが出力に含めないので、`scripts/copy-maplibre-worker.mjs` が `public/maplibre/` へ写す（コミットしない）。写すのは `npm ci` / `npm install` のあと（`postinstall`）と、念のため `npm run dev` / `npm run build` の前。Build Command を `next build` に変えても、install のあとにできたファイルが使われる。ファイルがないと、ビルドは通るのに地図の背景だけが描かれない（エラーにならず気づきにくい）。

## 注意

- `.env.local` はコミットしない
- `SECRET_KEY`（service_role）はクライアントに絶対出さない。使う場合は `NEXT_PUBLIC_` を付けずサーバー側のみで使う
- 新しいテーブルは必ず RLS を有効化する

## 実装の約束ごと

- `next.config.ts` で Cache Components が有効。cookie や DB を読むコンポーネントは `<Suspense>` の内側に置く（外に置くとビルドエラーになる）
- 未実装の箇所には `TODO(#番号)` コメントを付けている（番号は GitHub の Issue）
- ログイン機能はない（#3 で決定、#37 で削除）。投稿・口コミはログインなしの匿名（ニックネームだけ）で受け付ける。DB の読み取りは匿名キー（publishable key）で行う
