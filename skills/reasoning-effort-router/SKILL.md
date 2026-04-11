---
name: reasoning-effort-router
description: Classify a task by required reasoning depth before working. Use whenever a request may involve code, architecture, debugging, DB/schema, auth, deployment, multi-file edits, or when the user mentions saving tokens, reasoning effort, 推論, high/low effort, or asks whether a task should be handled lightly or carefully.
---

# Reasoning Effort Router

Route each task to the cheapest safe working depth before doing substantial work.

This skill does not magically change the model setting by itself. It changes the work plan: how much context to read, how much design analysis to do, what verification to run, and whether to pause before risky edits. If the environment supports explicit reasoning effort selection, use this classification to choose it.

## Fast Route

Before reading many files or editing, classify the task:

1. `low`
2. `medium`
3. `high`
4. `xhigh`

Keep the classification internal unless it would help the user understand cost, risk, or scope. When you do mention it, use one short sentence.

## Levels

### low

Use for:

- copy/text changes
- logo/image replacement
- small CSS tweaks with known selectors
- single known file edits
- docs wording
- simple command requests

Work style:

- Read only the known target file or exact lines.
- Do not write a long plan.
- Avoid broad searches.
- Run targeted verification; build only if the touched surface can break the app.
- Final answer should be short.

### medium

Use for:

- normal UI changes
- small feature additions
- local state changes
- 2-4 related files
- straightforward bug fixes
- adding a route or component in an established pattern

Work style:

- Read `CONTEXT.md` and the relevant route/component/lib files.
- Give a short progress update before edits.
- Keep patches local.
- Run `npm run build` for Next.js changes.
- Update `CHANGELOG.md` if behavior changes.

### high

Use for:

- Supabase schema or RLS
- auth, permissions, user data, sync, payments, privacy
- data migration or backward compatibility
- multi-screen state changes
- public navigation or deployment behavior
- large CSS/global style changes
- unclear bugs with real user impact

Work style:

- Read `CONTEXT.md`, `CURRENT_TASK.md`, and relevant `DECISIONS.md`.
- Identify edit scope and risk before touching files.
- For schema changes, update `supabase/README.md` and `CHANGELOG.md`.
- Run `npm run preflight` and `npm run build` when applicable.
- Leave a clear note about live deployment or DB apply requirements.

### xhigh

Use for:

- possible data loss
- security exposure
- destructive commands
- production incident response
- large refactors
- cross-agent merge conflicts
- changing foundational architecture

Work style:

- Do not rush into edits.
- First map the current state and likely failure modes.
- Split the task into safe phases.
- Avoid destructive commands unless explicitly requested and approved.
- Prefer reversible patches and explicit verification.
- Update `HANDOFF.md` if the task may continue across sessions or agents.

## Escalation Rules

Route one level higher when any of these are present:

- `schema.sql`, RLS, auth, session, owner/member roles, or user ids
- localStorage to DB migration
- hidden production behavior
- unknown ownership of current worktree changes
- public route, metadata, SEO, sitemap, or app-wide layout
- request includes "最適", "設計", "安全", "本番", "同期", "権限", "壊れてる"

Route one level lower only when:

- the exact file and exact replacement are known
- no persisted data or auth boundary is involved
- the change is reversible and easy to inspect

## Read Scope

Choose the smallest read scope that fits the level:

- `low`: exact file/line or direct asset.
- `medium`: route + component + helper.
- `high`: context docs + affected layers.
- `xhigh`: context docs + affected layers + history/status/handoff.

Avoid reading large generated files unless the task is specifically about them.

## Verification

Default verification by level:

- `low`: syntax check or targeted command when useful.
- `medium`: `npm run build` for app changes.
- `high`: `npm run preflight` plus `npm run build` when app/schema/auth is touched.
- `xhigh`: preflight, build/test, targeted runtime checks, and handoff notes.

## Output

When useful, report:

```txt
Reasoning route: medium
Why: UI state change across one component and one helper.
Read scope: component + helper only.
Verify: npm run build.
```

Do not over-explain this for tiny tasks. The goal is to save attention, not create ceremony.
