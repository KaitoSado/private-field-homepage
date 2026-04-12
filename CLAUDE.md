# CLAUDE.md

最初に [`CONTEXT.md`](/Users/sadokaito/Downloads/homepage/CONTEXT.md) を読むこと。
ここでは Claude Code 向けの作業ルールだけを補足する。

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

## 編集ルール

- 同時に大きな面を複数触らない
- `app/globals.css` は影響範囲が広いので、対象セクションだけを最小限編集する
- schema 変更時は `supabase/schema.sql` を唯一のソースとして更新する
- UI テキストの追加は抑制し、説明文でなく見た目で意味が分かる設計を優先する

## Git ルール

- Claude 側ブランチは `claude/<task>` を使う
- 直接 `main` を編集しない
- commit 前に `npm run build` を通す
- ユーザーが実装・修正を依頼した場合は、明示的に止められない限り `build -> 関連差分だけ commit -> push` まで一連で行う
- build 失敗、未確認の無関係差分、schema の live 適用判断、衝突リスクがある場合は commit / push せず報告する

## Claude 固有メモ

- 試作や大きめのデザイン案は `.claude/worktrees/` に逃がしてから本体へ取り込む
- 本体へ入れる時は差分を小さくし、取り込んだ理由を `CHANGELOG.md` に残す
