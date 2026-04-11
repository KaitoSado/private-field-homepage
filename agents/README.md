# agents

このディレクトリは、複数AIで作業する時の軽量な役割定義を置く。
正本の作業ルールは `AGENTS.md`、プロジェクト事実は `CONTEXT.md` に置く。

## 使い分け

- `planner.md`: 実装前の分解、リスク、順序設計
- `coder.md`: 小さい patch、検証、handoff しやすい実装
- `reviewer.md`: bug、回帰、テスト不足の検出

恒常的な能力や workflow は `skills/` に置く。
一時的な役割分担やハーネスから読み込む persona は `agents/` に置く。
