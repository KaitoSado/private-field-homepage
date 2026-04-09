# CHANGELOG

変更履歴を、人間とAIの両方が追える形で残す。

| date | agent | area | summary | verify |
| --- | --- | --- | --- | --- |
| 2026-04-10 | codex | games | `賽の河原` の配置操作をドラッグ主体に変え、石が 1 個でも台から落ちたら即終了するルールへ調整 | `node --check public/games/sainokawara/script.js`, `npm run build` |
| 2026-04-10 | codex | games | `賽の河原` の static asset 参照を相対パスから `/games/sainokawara/...` の絶対パスへ切り替え、trailing slash の有無で CSS/JS が落ちる不具合を修正 | `npm run build` |
| 2026-04-10 | codex | games | `賽の河原` の Matter.js 読み込みを CDN から `public/games/sainokawara/vendor/matter.min.js` のローカル同梱へ切り替え、開始ボタンが外部 script 失敗で止まらないようにした | `node --check public/games/sainokawara/script.js`, `npm run build` |
| 2026-04-10 | codex | games | `賽の河原` の石形状を増やし、game over 判定を緩和しつつ、月夜と霧の背景・危険度メーター・高さ連動の微風・危険成功時の倍率を追加した | `node --check public/games/sainokawara/script.js`, `npm run build` |
| 2026-04-10 | codex | games | `/games/sainokawara/` に standalone な静的ゲーム `賽の河原` を追加し、`/apps/games` から埋め込み・単独起動できるようにした | `node --check public/games/sainokawara/script.js`, `npm run build` |
| 2026-04-09 | codex | physics app | `/apps/physics` を `Sandbox / Guided Lab / Math Link / Theory Map` 中心の Physics Playground に再構成し、放物運動・衝突・単振動・理想気体・波の反射 / 屈折・ローレンツ変換・1D量子井戸の 7 scene を共通 runner に実装 | `npm run build` |
| 2026-04-09 | codex | physics app | `/apps/physics` を `Emergence Lab` 方向へ拡張し、剛体・流体・電磁波・不可逆性・相転移・ローレンツ変換・前期量子論・1D量子・量子調和振動子・カオスの 10 scene を共通 runner 上に実装 | `npm run build` |
| 2026-04-09 | codex | physics app | `/apps/physics` を overlay 中心の Physics Playground へ組み替え、`Playground / Law View / World Shift` と `Motion / Collision / Rotation / Gas / Relativity / Quantum` の章構成に刷新 | `npm run build` |
| 2026-04-09 | codex | physics app | `/apps/physics` に `Physics Playground` を追加し、放物運動・バネ振動・電場・幾何光学の MVP と Sandbox / Guided Lab / Theory Map を実装 | `npm run build` |
| 2026-04-09 | codex | apps copy | `/apps/math` とアプリ一覧での名称を `数学コミュニティ` から `数学コンテンツ` に変更 | `npm run build` |
| 2026-04-09 | codex | research progress ui | 研究室パイプラインの各 project に全体進捗シークバーを追加し、段階ラベルと全体％を同時に見えるようにした | `npm run build` |
| 2026-04-09 | codex | research progress | `/apps/research-progress` を研究ライン中心の研究室ポートフォリオに拡張し、`research_projects` / `research_project_members` / project 管理 API・UI を追加 | `npm run build` |
| 2026-04-09 | codex | research progress | 招待制の研究進捗 app `/apps/research-progress` を追加し、group / membership / weekly update / owner review 用 API・UI・Supabase schema を実装 | `npm run build` |
| 2026-04-09 | codex | apps | `/apps` に公開アプリ一覧の下で内部・招待制ツールを示す `非公開アプリ一覧` セクションを追加 | `npm run build` |
| 2026-04-08 | codex | branding | ブランド名を `FieldCard Social` から `New Commune` に変更し、header mark・tagline・metadata・README / legal copy を同期 | `npm run build` |
| 2026-04-08 | codex | skills | `frontend-structure-optimizer` を明示呼び出し中心に調整し、repo 正本から `~/.codex/skills` へ同期する `scripts/sync-skill-to-codex.sh` を追加 | `sh scripts/sync-skill-to-codex.sh frontend-structure-optimizer`, `ruby YAML parse`, `npm run build` |
| 2026-04-08 | codex | skills | `skills/frontend-structure-optimizer` の初版 draft を追加し、project-local skill 用の構造を `CONTEXT.md` / `DECISIONS.md` に反映 | `ruby YAML parse`, `npm run build` |
| 2026-04-08 | codex | apps copy | `/apps` のタイトル系とホームの `Apps` 見出しを `アプリ一覧` に統一 | `npm run build` |
| 2026-04-04 | codex | coordination | `CONTEXT.md`, `CLAUDE.md`, `AGENTS.md`, `DECISIONS.md`, `CURRENT_TASK.md`, `HANDOFF.md`, `CHECKLIST.md`, `supabase/README.md` を追加 | `npm run build` |
