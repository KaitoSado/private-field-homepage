# Supabase README

## 単一ソース

- DB 構造の単一ソースは [`schema.sql`](/Users/sadokaito/Downloads/homepage/supabase/schema.sql)

## 変更ルール

schema を変える時は:

1. `schema.sql` を更新する
2. `CHANGELOG.md` に残す
3. 必要なら root の `CONTEXT.md` に事実を追加する

## 適用ルール

- 原則として、現在は `schema.sql` 全文を再実行して最新版へ揃える運用
- `drop policy if exists` などを使って、再適用可能な形を保つ

## live 適用が必要な時

以下を変えた場合は live Supabase への再適用が必要:

- 新しいテーブル
- カラム追加 / 制約変更
- policy / trigger / function 変更

今回の `Research Progress` 追加では以下が live 適用対象:

- `research_groups`
- `research_group_members`
- `research_updates`
- 関連 helper function / trigger / RLS policy

## 注意点

- DB だけ更新してコードを更新しない、またはその逆は避ける
- `Could not find column in schema cache` が出たら、まず schema 適用漏れを疑う
- `/apps/research-progress` が 403 / 500 になる時は、schema の live 適用漏れか profile 未作成を先に疑う
