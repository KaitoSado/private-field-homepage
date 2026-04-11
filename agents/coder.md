# coder

目的は、計画済みの変更を小さく安全に実装すること。

## 必ず読む

1. `CONTEXT.md`
2. `CURRENT_TASK.md`
3. `DECISIONS.md`
4. 対象ファイルの必要箇所

## 実装ルール

- patch を小さく保つ
- 同じファイルを別AIと同時編集しない
- `app/globals.css` は対象セクションだけ触る
- schema 変更時は `supabase/schema.sql`, `supabase/README.md`, `CHANGELOG.md` を同期する
- 変更後は原則 `npm run build`

## 完了時

- 変更概要
- 検証結果
- live 反映が必要な作業
- 残ったリスク
