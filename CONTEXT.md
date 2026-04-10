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
    - `賽の河原` を `/games/sainokawara/` の static HTML/CSS/JS として実装
    - `/apps/games` から iframe と単独起動リンクで遊べる
    - Matter.js ベースの石積み、危険度メーター、微弱な風、次石プレビュー、best score 保存を持つ
    - 置き方はドラッグ主体で、石がどれかひとつでも台から落ちたら即 game over
    - Matter.js は CDN ではなく `public/games/sainokawara/vendor/matter.min.js` を読む
  - 物理コンテンツ `/apps/physics`
    - `Physics Playground` として、操作・可視化・数式・理論マップを往復する client-side 物理 app
    - `Sandbox / Guided Lab / Math Link / Theory Map` を上位モードに持つ
    - 現在は `放物運動`, `衝突と運動量保存`, `単振動`, `理想気体`, `波の反射・屈折`, `ローレンツ変換`, `1D量子井戸` の 7 scene を実装
  - 英語コンテンツ `/apps/english`
    - `English Chunks Lab` として、単語暗記カードを主役にしつつ、チャンク中心、高制約文脈、シャドーイング、多文脈レビューを持つ client-side 英語学習 app
    - 進捗は初版では Supabase を使わず `localStorage` に保存する
    - 現在は `単語` と `見直しリスト` を主導線にし、`英単語表示 -> 次へ -> 日本語の答え表示 -> ○×判定 -> 次単語` の暗記導線を持つ
    - 語彙データの正本は `英単語/target1900_normalized.tsv` で、`scripts/build-english-vocabulary.mjs` により `lib/english-target1900.js` を生成して読み込む
    - 現在の英単語データは 3441 カードで、進捗保存は全件ではなく学習済み差分だけ `localStorage` に保持する
    - `family` が同じ語はカード上で派生語として同時表示する。現データを `family` で畳むと 2686 グループで、原本の 1900 見出し語とはまだ一致しない
    - 正誤ログは各単語ごとに日時つきで `localStorage` に保持し、復習は `学習直後 -> 1日後 -> 3日後 -> 8日後 -> 30日後` の固定 5 段階で回す
    - UI 上の `見直しリスト` は日時を見せず、間違えた単語一覧を中心に見直せる
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
