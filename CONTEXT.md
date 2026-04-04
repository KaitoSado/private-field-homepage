# CONTEXT

このファイルは、このリポジトリの「事実」を一元管理するための共通コンテキストです。
`CLAUDE.md` と `AGENTS.md` はこのファイルを先に読む前提です。

## 1. プロダクトの要約

- サービス名: `FieldCard Social`
- 性質: 公開プロフィール + 記事 + 学生向け Apps を持つ Next.js アプリ
- 想定ユーザー: 慶應 / SFC 周辺の学生・院生
- 中心導線:
  - 公開プロフィール `/@username`
  - 発見 `/explore`
  - アプリ `/apps`
  - 通知 `/notifications`
  - マイページ `/me` は補助ハブ

## 2. 技術スタック

- フロント: `Next.js` App Router
- 言語: JavaScript
- 認証 / DB / Storage: `Supabase`
- デプロイ: `Vercel`
- 画像・静的ファイル: `public/`

## 3. よく使うコマンド

- 開発: `npm run dev`
- ビルド確認: `npm run build`
- 事前チェック: `npm run preflight`

## 4. 主要ディレクトリ

- `app/`
  - ルーティングとページ
- `components/`
  - UI とアプリ機能の本体
- `lib/`
  - データ取得、URL、Supabase クライアント等
- `supabase/`
  - `schema.sql`, `first-admin.sql`
- `public/`
  - アバターや静的アセット
- `docs/`
  - プロジェクト文書
- `.claude/worktrees/`
  - Claude 側の試作・分岐用

## 5. 実装済みの主要面

- 公開プロフィール
  - 通常テーマ
  - `signature` テーマ
- 記事
- 特別記事
- 匿名質問箱
- 通知
- 管理画面 / 通報
- Apps
  - 裏シラバス `/apps/classes`
  - エッジ情報 `/apps/edge`
  - 助け合いボード `/apps/help`
  - 祈祷と呪詛 `/apps/ritual`
  - Games `/apps/games`

## 6. データベース運用ルール

- DB の単一ソースは `supabase/schema.sql`
- schema 変更時は:
  1. `supabase/schema.sql` を更新
  2. 必要なら `supabase/README.md` と `CHANGELOG.md` を更新
  3. live 環境に再適用が必要な場合は明記
- `if exists` / `drop policy if exists` 前提で、再実行可能な schema を維持する

## 7. デザインと CSS の現状

- 現状のグローバル CSS は `app/globals.css` に集約されている
- まだ機能単位分割は未完了
- 触る際は:
  - どの面を変えるかを明確にする
  - 無関係なセクションをまとめて触らない
  - CSS 変更後は必ず `npm run build` で確認する

## 8. Git / ブランチ運用

- 安定反映の基点: `public-site`
- push 先: `origin main`
- 機能開発ブランチ:
  - `codex/<task>`
  - `claude/<task>`
- 原則:
  - 1タスク = 1ブランチ = 1担当AI
  - 同じファイルを 2 つの AI が同時に編集しない

## 9. AI 協調の基本ルール

- `CONTEXT.md` は事実のみ
- 設計判断は `DECISIONS.md`
- 進行中タスクは `CURRENT_TASK.md`
- 引き継ぎは `HANDOFF.md`
- 変更履歴は `CHANGELOG.md`

## 10. いま重要な注意点

- 公開ページ編集が主導線
- `/dashboard` は旧導線が残るだけで主導線ではない
- `@keio.jp / @keio.ac.jp` の扱いは信頼軸に関わるため慎重に変更する
- Apps は学内向けの実用面として拡張中

