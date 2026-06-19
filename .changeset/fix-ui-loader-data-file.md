---
"@lcui/cli": patch
---

fix(cli): gracefully skip ui-loader for data-only TypeScript files

When a `.ts` file under `app/` or `src/` exports no component functions (i.e. only plain variables, interfaces, or constants), ts-loader now returns `undefined` to the loader chain, and ui-loader handles this by passing through without generating C code. Previously ui-loader would throw "invalid content", breaking the entire build.

This aligns with webpack's loader semantics where loaders may return `null`/`undefined` to signal a no-op pass.
