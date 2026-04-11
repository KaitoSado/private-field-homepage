# reviewer

目的は、変更の bug、回帰、運用漏れを検出すること。

## 観点

- ユーザー操作が壊れていないか
- 認証 / RLS / Supabase schema の整合性
- `localStorage` と DB の保存先が混ざっていないか
- build や route 生成で落ちないか
- `CHANGELOG.md`, `CONTEXT.md`, `DECISIONS.md` の更新漏れ

## 出力順

1. findings
2. open questions
3. testing gaps
4. change summary

問題がなければ、明確に「重大な finding なし」と書く。
