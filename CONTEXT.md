# CONTEXT

このファイルは、このリポジトリの「事実」を一元管理するための共通コンテキストです。
`CLAUDE.md` と `AGENTS.md` はこのファイルを先に読む前提です。

## 1. プロダクトの要約

- サービス名: `New Commune`
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
- `skills/`
  - Codex / 他エージェント向けの project-local skill
  - 実運用する skill の正本は repo 内 `skills/` に置き、`scripts/sync-skill-to-codex.sh` で `~/.codex/skills/` に同期する
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
  - 物理コンテンツ `/apps/physics`
    - `Physics Playground: Emergence Lab` として、秩序、波、時空、量子化を共通 runner で読む client-side 物理 app
    - `Playground / Law View / Emergence` を入口に、`回る / 流れる / 伝わる / 乱れる / 切り替わる / 歪む / 量子になる` のカテゴリから scene を選ぶ
    - 現在は `剛体`, `流体`, `電磁波`, `熱力学第二・第三法則`, `相転移`, `ローレンツ変換`, `前期量子論`, `1D量子`, `量子調和振動子`, `非線形・カオス` の簡易 scene を実装
  - リサーチプログレス `/apps/research-progress`
    - 招待制の研究会 / ゼミ / 小規模PJ向け研究ライン + 週次チェックイン面
    - グループ一覧 `/apps/research-progress`
    - グループ別ダッシュボード `/apps/research-progress/[slug]`
    - group owner が研究計画、研究費申請、ポスター、論文投稿までの案件パイプラインを管理できる
  - アプリ一覧 `/apps` は公開中アプリと非公開アプリを分けて表示する

## 6. データベース運用ルール

- DB の単一ソースは `supabase/schema.sql`
- schema 変更時は:
  1. `supabase/schema.sql` を更新
  2. 必要なら `supabase/README.md` と `CHANGELOG.md` を更新
  3. live 環境に再適用が必要な場合は明記
- `if exists` / `drop policy if exists` 前提で、再実行可能な schema を維持する
- `research_*` 系テーブルはリサーチプログレス用の正本で、`research_groups`, `research_group_members`, `research_updates`, `research_projects`, `research_project_members` を含む
- `research_*` 系の変更は live 反映に Supabase への schema 再適用が必要

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
