# AGENTS.md

最初に [`CONTEXT.md`](/Users/sadokaito/Downloads/homepage/CONTEXT.md) を読むこと。
ここでは Codex / 他エージェント向けの作業ルールだけを補足する。

## 共通ルール

- `CONTEXT.md` を事実の単一ソースとする
- 事実を増やす時は、まず `CONTEXT.md` を更新する
- 設計判断は `DECISIONS.md` に書く
- 進行中作業は `CURRENT_TASK.md` に置く
- 別AIに渡す時は `HANDOFF.md` を更新する
- 変更履歴は `CHANGELOG.md` に残す

## 作業開始前

1. `CONTEXT.md`
2. `CURRENT_TASK.md`
3. `DECISIONS.md`
4. 必要なら `HANDOFF.md`

の順に確認する。

## プロジェクト構造

- `app/`: ルーティングとページ
- `components/`: UI 本体
- `lib/`: 共通ロジックと Supabase 周辺
- `supabase/`: DB schema と初期 SQL
- `public/`: 静的アセット

## CSS 設計方針

- 現状は `app/globals.css` 中心
- まだ完全分割されていないので、編集は最小範囲で行う
- 一度に複数の unrelated セクションを触らない
- class 名は「面 + 機能」で切る
  - 例: `home-*`, `signature-*`, `arcade-*`, `class-board-*`

## 命名規則

- コンポーネント: `PascalCase`
- 関数 / 変数: `camelCase`
- CSS class: 機能接頭辞付き kebab-case
- route 名: 意味単位で短く

## コンポーネント依存関係

- `app/*` は基本的に `components/*` を呼ぶ
- `components/*` は `lib/*` を使ってよい
- `lib/*` は UI に依存しない
- DB の真実は `supabase/schema.sql`

## ブランチ戦略

- Codex: `codex/<task>`
- Claude: `claude/<task>`
- 安定運用ブランチ: `public-site`
- push 前に `npm run build`

## 編集時の注意点

- 同じファイルを別AIと同時編集しない
- schema 更新があるなら `supabase/README.md` と `CHANGELOG.md` に残す
- 公開ページ周りは影響が大きいので、URL ベースで確認箇所を明記する

## エージェント固有メモ

- Codex は patch 単位で小さく変更する
- 変更後は build を通し、最後に確認先 URL を残す

