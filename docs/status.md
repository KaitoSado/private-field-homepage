# Status Guide

このファイルは、このプロジェクトの「今どこを見ればよいか」を 1 か所に集めるための入口です。

## 1. まず何を確認するか

- 今やっている作業:
  - [`CURRENT_TASK.md`](/Users/sadokaito/Downloads/homepage/CURRENT_TASK.md)
- 事実の前提:
  - [`CONTEXT.md`](/Users/sadokaito/Downloads/homepage/CONTEXT.md)
- 判断理由:
  - [`DECISIONS.md`](/Users/sadokaito/Downloads/homepage/DECISIONS.md)
- 引き継ぎ:
  - [`HANDOFF.md`](/Users/sadokaito/Downloads/homepage/HANDOFF.md)
- 変更履歴:
  - [`CHANGELOG.md`](/Users/sadokaito/Downloads/homepage/CHANGELOG.md)

## 2. repo 内で分かること

repo 内では、次の情報を確認できます。

- どんなサービスか
- 技術スタック
- 主要ルートと主要 Apps
- 実装方針
- 現在の優先タスク
- 設計判断
- 変更履歴
- Supabase schema の正本
- リリース時の確認手順

主な参照先:

- [`README.md`](/Users/sadokaito/Downloads/homepage/README.md)
- [`CONTEXT.md`](/Users/sadokaito/Downloads/homepage/CONTEXT.md)
- [`DECISIONS.md`](/Users/sadokaito/Downloads/homepage/DECISIONS.md)
- [`CURRENT_TASK.md`](/Users/sadokaito/Downloads/homepage/CURRENT_TASK.md)
- [`CHANGELOG.md`](/Users/sadokaito/Downloads/homepage/CHANGELOG.md)
- [`supabase/schema.sql`](/Users/sadokaito/Downloads/homepage/supabase/schema.sql)
- [`docs/launch-checklist.md`](/Users/sadokaito/Downloads/homepage/docs/launch-checklist.md)

## 3. repo 内では分からないこと

次の情報は repo だけでは確定できません。

- Vercel で最新デプロイが成功しているか
- どの commit が現在 live に出ているか
- Supabase 本番 DB に最新 schema が再適用されているか
- Storage bucket や Auth 設定の live 状態
- 環境変数が本番で正しく入っているか

つまり:

- repo = 方針、履歴、コードの正本
- 外部サービス = 実際の本番状態

## 4. 本番状態の確認場所

### Vercel

- 最新デプロイの成否
- production branch の設定
- 環境変数
- build log

### Supabase

- SQL が live DB に入っているか
- Auth 設定
- Storage bucket
- RLS / policy の反映

### 実際の画面

- ホーム:
  - [https://archteia.com](https://archteia.com)
- 発見:
  - [https://archteia.com/explore](https://archteia.com/explore)
- アプリ一覧:
  - [https://archteia.com/apps](https://archteia.com/apps)
- リサーチプログレス:
  - [https://archteia.com/apps/research-progress](https://archteia.com/apps/research-progress)
- 拠点:
  - [https://archteia.com/me](https://archteia.com/me)
- ops:
  - [https://archteia.com/ops](https://archteia.com/ops)

## 5. 今の運用で特に重要なこと

- DB の単一ソースは [`supabase/schema.sql`](/Users/sadokaito/Downloads/homepage/supabase/schema.sql)
- schema 変更は live 適用漏れが起きやすい
- `research_*` テーブルを使う app は、Vercel 反映だけでなく Supabase schema 反映も必要
- `Research Progress` は週次テーブルに加えて `research_projects` / `research_project_members` にも依存する
- CSS は [`app/globals.css`](/Users/sadokaito/Downloads/homepage/app/globals.css) への依存がまだ大きい
- Apps は拡張頻度が高く、衝突しやすい
- 2つの AI が同じファイルを同時に触らない

## 6. 状況確認で毎回見るとよい項目

### コード側

- 現在ブランチ
- `git status`
- 直近の `CHANGELOG`
- `CURRENT_TASK`
- `HANDOFF`

### 本番側

- Vercel の最新 deploy 成功
- Supabase schema の適用状況
- 実画面の主要導線

## 7. 最低限の確認コマンド

```bash
git branch --show-current
git status --short
npm run build
```

必要に応じて:

```bash
git log --oneline -n 10
```

## 8. 変更を入れたときの更新先

### ほぼ毎回更新

- [`CHANGELOG.md`](/Users/sadokaito/Downloads/homepage/CHANGELOG.md)

### 進行中タスクが変わったら更新

- [`CURRENT_TASK.md`](/Users/sadokaito/Downloads/homepage/CURRENT_TASK.md)

### 引き継ぎが必要なら更新

- [`HANDOFF.md`](/Users/sadokaito/Downloads/homepage/HANDOFF.md)

### 事実の前提が変わったら更新

- [`CONTEXT.md`](/Users/sadokaito/Downloads/homepage/CONTEXT.md)

### 判断ルールが変わったら更新

- [`DECISIONS.md`](/Users/sadokaito/Downloads/homepage/DECISIONS.md)

## 9. このファイルで追加した情報

既存ファイル群だけだと不足していたのは次の点です。

- repo 内で分かることと、分からないことの切り分け
- Vercel / Supabase / 実画面のどこを見れば live 状態が分かるか
- 毎回の最低限チェック項目
- 変更時にどの文書を更新するべきか

このファイルは「詳細を書く場所」ではなく、「確認場所を迷わないための目次」として使います。
