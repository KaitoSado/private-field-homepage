---
name: frontend-structure-optimizer
description: Audit and safely reduce frontend structural debt across HTML, CSS, and JS/TS. Use when Codex needs to inspect or clean unused selectors, duplicate styles, redundant wrappers, overgrown global CSS, repeated DOM/UI logic, or prepare a web UI codebase for safer customization and refactoring without casually changing behavior.
---

# Frontend Structure Optimizer

Audit frontend structure across markup, styles, and UI logic. Prefer small, defensible cleanups over broad rewrites.

## Core Promise

Preserve appearance and behavior while identifying structural debt and applying only clearly safe fixes.

Treat this skill as a structural auditor first and a code editor second.

## Workflow

### 1. Scope the codebase

Inspect only the folders that matter for the requested UI surface.

Prioritize:

- markup files: `.html`, `.jsx`, `.tsx`, `.vue`, template files
- style files: `.css`, `.scss`, `.sass`, CSS modules, global styles
- UI logic files: `.js`, `.ts`, `.jsx`, `.tsx`

Build a quick map of:

- entry routes or pages
- shared components
- global style layers
- feature-local style files
- obvious interactive modules

### 2. Cross-check usage

Cross-check the same feature through three lenses:

1. Markup usage
2. Style definitions
3. UI logic references

When auditing CSS, always look for:

- selectors referenced directly in markup
- selectors referenced via `className`, `classList`, string concatenation, helper functions, variants, or conditional rendering
- selectors that appear to be page-local but live in global styles

When auditing JS or TS, always look for:

- repeated DOM queries
- repeated toggle logic
- duplicated event wiring
- presentational constants scattered across multiple files

### 3. Classify findings

Classify every finding with:

- `severity`: `high`, `medium`, or `low`
- `confidence`: `high`, `medium`, or `low`
- `fixability`: `auto-fixable`, `review-required`, or `manual-only`

Use `high confidence` only when static evidence is strong.

Lower confidence whenever markup, styling, or behavior may be driven by:

- dynamic class construction
- CMS or server templates outside the current files
- feature flags or conditional rendering
- lazy-loaded UI
- animation or measurement wrappers

### 4. Choose a mode

Support exactly these modes:

- `audit`
  - Report findings only.
- `safe-fix`
  - Apply only narrow fixes with strong evidence of safety.
- `aggressive-fix`
  - Prepare larger structural changes, but prefer proposed patches over direct edits unless the user explicitly asks for deeper refactors.

If the user does not specify a mode, default to `audit`.

### 5. Report before large edits

Before touching multiple files or changing structure, summarize:

- what is structurally wrong
- what is safe to fix now
- what is risky and will remain proposal-only

If the request is explicitly a review, lead with findings rather than change summaries.

## What to Detect

### CSS

Detect:

- unused selector candidates
- duplicate selectors
- near-duplicate rule groups
- repeated property clusters that should become shared primitives
- selectors with unnecessary depth or specificity
- `!important` usage
- page-specific rules living in global CSS
- style layers that mix base, layout, component, and utility concerns

Treat these as especially valuable:

- repeated card shells
- repeated button variants
- repeated section wrappers
- repeated state styles such as `is-active`, `is-open`, `is-selected`

### Markup

Detect:

- redundant wrappers
- repeated layout skeletons
- weak semantics where a more meaningful tag is obvious
- inconsistent naming granularity
- inline styles that should be extracted
- elements that exist only for styling when a simpler structure would work

Do not recommend wrapper removal if the wrapper likely supports:

- positioning context
- animation
- hit testing
- overflow clipping
- accessibility labeling
- JS measurement or refs

### JS and TS

Detect:

- unused imports
- unused local helpers
- repeated DOM queries
- repeated event handlers with the same shape
- duplicated UI state transitions
- styling decisions duplicated in logic
- files that clearly mix multiple UI responsibilities

Prefer “extract shared helper” recommendations when the repetition is real and local. Do not force abstraction after one or two weakly similar cases.

## Safe-Fix Rules

Apply direct edits only when the change is clearly local and behavior-preserving.

Usually safe:

- remove unused imports confirmed within the file
- merge exactly duplicated CSS declarations when references are clear
- delete dead local helpers with no references
- normalize obviously duplicated literals within a tightly scoped file
- move repeated presentational declarations into an existing local primitive if the scope is already shared

Usually not safe without review:

- delete unused-looking CSS selectors
- remove wrappers
- rename classes
- move rules across global and local style boundaries
- split or merge large files
- replace tags for semantics alone
- abstract event systems or state models

When in doubt, downgrade to `review-required`.

## Framework Notes

Prefer lightweight, source-driven heuristics over toolchain assumptions.

Use [framework-notes.md](./references/framework-notes.md) when the codebase uses React, Next.js, Tailwind-like patterns, CSS modules, or CSS-in-JS.

## Output Format

Keep output compact and decision-oriented.

For `audit`, report:

- the most important findings first
- file references
- why each issue matters
- how safe a fix would be

For `safe-fix`, report:

- what was changed
- what was intentionally not changed
- residual risks or follow-up candidates

For `aggressive-fix`, report:

- proposed structural direction
- concrete patches or patch-ready steps
- the validation still required after applying them

## Operating Principles

Prefer:

- local evidence over sweeping inference
- fewer high-confidence findings over many noisy findings
- existing project conventions over imported style dogma
- structural clarity over cosmetic tidiness

Avoid:

- deleting broad CSS based on search alone
- assuming a selector is dead because it is not found in static markup
- forcing BEM, utility-first, or component-first naming unless the repo already leans that way
- rewriting for elegance when the user asked for safety

## Validation

After edits, run the smallest relevant verification available.

Prefer:

- project build
- lint or typecheck if already configured
- targeted smoke checks for touched routes

If no reliable automated check exists, say so explicitly.
