# CHANGELOG

変更履歴を、人間とAIの両方が追える形で残す。

| date | agent | area | summary | verify |
| --- | --- | --- | --- | --- |
| 2026-04-09 | codex | apps | `/apps` に公開アプリ一覧の下で内部・招待制ツールを示す `非公開アプリ一覧` セクションを追加 | `npm run build` |
| 2026-04-08 | codex | branding | ブランド名を `FieldCard Social` から `New Commune` に変更し、header mark・tagline・metadata・README / legal copy を同期 | `npm run build` |
| 2026-04-08 | codex | skills | `frontend-structure-optimizer` を明示呼び出し中心に調整し、repo 正本から `~/.codex/skills` へ同期する `scripts/sync-skill-to-codex.sh` を追加 | `sh scripts/sync-skill-to-codex.sh frontend-structure-optimizer`, `ruby YAML parse`, `npm run build` |
| 2026-04-08 | codex | skills | `skills/frontend-structure-optimizer` の初版 draft を追加し、project-local skill 用の構造を `CONTEXT.md` / `DECISIONS.md` に反映 | `ruby YAML parse`, `npm run build` |
| 2026-04-08 | codex | apps copy | `/apps` のタイトル系とホームの `Apps` 見出しを `アプリ一覧` に統一 | `npm run build` |
| 2026-04-04 | codex | coordination | `CONTEXT.md`, `CLAUDE.md`, `AGENTS.md`, `DECISIONS.md`, `CURRENT_TASK.md`, `HANDOFF.md`, `CHECKLIST.md`, `supabase/README.md` を追加 | `npm run build` |
