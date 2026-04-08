# Framework Notes

Use this note when the target codebase is not plain static HTML/CSS/JS.

## React and Next.js

Treat JSX `className` values as first-class selector references.

Check for:

- template literals
- conditional class joins
- variant helpers
- props that pass class names downward
- component wrappers that exist for refs, animation, or layout effects

Be careful with:

- server and client component boundaries
- route-level layouts
- shared global CSS that intentionally styles many pages
- components that render children into repeated structural shells

Do not mark a selector as unused until checking:

- parent components
- route files
- variant props
- helper utilities for class assembly

## CSS Modules

Expect selectors to be referenced indirectly through imported objects.

Before calling a rule unused, check whether:

- the module export is referenced
- the selector is composed into another class
- the style file defines state modifiers used by the component

## Tailwind and Utility-Heavy Codebases

Do not use this skill as a dead-CSS detector for Tailwind utilities.

Instead, focus on:

- repeated markup structures
- repeated utility bundles that want extraction
- duplicated state logic
- layout wrappers that should become components

## CSS-in-JS

Treat style literals and styled components as style definitions, not as ordinary JS constants.

Focus on:

- duplicate style objects
- repeated tokens
- component-local repetition

Avoid broad “unused CSS” claims unless the style declaration is obviously unreachable.
