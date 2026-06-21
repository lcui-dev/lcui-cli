# Fragment Children Flattening Design

## Problem

Components with `shouldPreRender = true` cannot use React.Fragment in children
(e.g., in `.map()` callbacks). The compiler throws `SyntaxError("React.Fragment
is not supported")` when it encounters a Fragment element.

This forces developers to wrap multiple sibling elements in a container widget,
which creates unwanted nesting — for example, a table row and its detail section
must be nested under one parent instead of being siblings.

## Goal

Automatically flatten Fragment elements in children processing, so that

```tsx
{fields.map((field) => (
  <>
    <Widget className="field-table-row">...</Widget>
    <Widget className="field-table-details">...</Widget>
  </>
))}
```

compiles to two sibling child nodes instead of requiring a wrapper.

## Scope

- **In scope**: Fragment flattening in `transformNodeChildren` (children array).
- **Out of scope**: Fragment as root element of a component, Fragment in
  `shouldPreRender` recursive path. These still throw `SyntaxError`.

## Changes

### 1. `packages/react/src/compiler/compile.ts`

Add `flattenChildren(rawChildren)` helper before `transformNodeChildren`:

- Recursively walks children via `React.Children.forEach`.
- When a Fragment element is encountered, its `props.children` are recursively
  flattened into the result.
- Non-Fragment children pass through unchanged.

In `transformNodeChildren`, call `flattenChildren(rawChildren)` before the
categorization loop. No other changes to the function.

The `throw new SyntaxError("React.Fragment is not supported")` in
`transformReactNode` remains — it blocks Fragment in unsupported positions.

### 2. `packages/react/src/compiler/jsx-runtime.ts`

Add `export { Fragment } from "react/jsx-runtime"` so compiled TSX can
reference the Fragment symbol at runtime.

## Testing

New test file `packages/react/test/fragment.test.mjs` covering:

- Basic Fragment flattening in children.
- Nested Fragment (Fragment inside Fragment).
- Fragment mixed with regular elements.
- Fragment with text children.
