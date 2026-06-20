---
"@lcui/react": patch
"@lcui/cli": patch
---

fix(react): prefix React dev-mode warnings with source file path

React's dev-mode `console.error` outputs (e.g., missing "key" prop in
`.map()`) were printed without any source file context during `lcui build`,
making it impossible to identify which `.tsx` triggered them.

Fix by adding an optional `filePath` field to `compile()` options. When
provided, `@lcui/react` temporarily patches `console.error` during
`componentFunc` execution and `transformReactNode`, prepending
`in <filePath>:` to each warning. The patch is reverted in a `finally`
block so the original `console.error` is always restored, even on exception.

`@lcui/cli`'s ts-loader now passes `loader.resourcePath` as `filePath`
when calling `compile()`, so every warning during build includes the
absolute path of the source file.
