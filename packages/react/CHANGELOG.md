# [0.5.0](https://gitee.com/lcui-dev/react/compare/v0.4.0...v0.5.0) (2025-01-07)

## 0.6.0

### Minor Changes

- b39bde0: Internal: split `src/` into `runtime/`, `compiler/`, and `widgets/` subdirectories.

  Add subpath exports so callers can import a narrower surface area:

  ```ts
  import { Button } from "@lcui/react/widgets";
  import { compile } from "@lcui/react/compiler";
  import { useState } from "@lcui/react/runtime";
  ```

  No breaking changes — every symbol previously exported from `@lcui/react` is
  still available from the package root.

- d97979c: feat(react): allow string C-function names on JSX event props

  `@lcui/cli`'s `ts-loader` has always supported `<button onClick="handle_click" />`
  as a way to bind a JSX event to a C function — at runtime the string is
  emitted as a `ui_widget_on(...)` call plus a forward declaration in the
  generated header. Until now this form failed TypeScript's type check because
  React declares e.g. `onClick` as `MouseEventHandler<T> | undefined`.

  This release ships a focused JSX type augmentation that widens the subset of
  `on*` event props that LCUI actually dispatches to also accept `string`. The
  augmentation is loaded automatically when you `import` from `@lcui/react`,
  so no user-side configuration is required. Covered props (chosen from
  `ui_event_type_t`):
  - Mouse: `onClick`, `onDoubleClick`, `onMouseDown`, `onMouseUp`,
    `onMouseMove`, `onMouseOver`, `onMouseOut`, `onWheel`
  - Keyboard: `onKeyDown`, `onKeyUp`, `onKeyPress`
  - Focus: `onFocus`, `onBlur`
  - Clipboard: `onPaste`
  - Form / value change: `onChange` (semantic `"change"` event dispatched by
    widgets such as `TextInput`)

  Event-name compatibility is handled by a small remap table in the React
  compiler so the names users write match the names LCUI actually dispatches:
  - `onDoubleClick` → `"dblclick"` (instead of the default `"doubleclick"`)
  - everything else falls back to the existing `onXxx → "xxx"` rule

  `TextInputProps` now also declares `onChange` explicitly for better IDE
  hints on `<TextInput>`.

  Props for browser-only events (drag / pointer / animation / transition /
  contextmenu / touch with mismatched names) and the `SVGAttributes`
  namespace are intentionally **not** widened: passing a string on those will
  keep failing type-checking, so users do not end up with code that compiles
  but cannot bind at runtime.

  JavaScript callbacks (`onClick={() => { ... }}`) continue to work unchanged
  and remain type-checked as before. Invalid values like `onClick={42}` are
  still rejected.

### Patch Changes

- 082269c: fix(react): bind every widget when multiple widgets share the same string event handler

  Previously the compiler deduplicated event handler declarations by name,
  which caused `ui_widget_on` to be emitted only for the first widget when
  several buttons shared the same `onClick="my_handler"`. Split the handler
  declaration (still deduplicated) from the per-widget binding (no longer
  deduplicated) so each widget correctly receives its own `ui_widget_on` call.

- 62e81f8: fix(react): prefix React dev-mode warnings with source file path

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

- b39bde0: Repository restructure: the three packages now live in a single monorepo at
  [`lcui-dev/lcui-toolkit`](https://github.com/lcui-dev/lcui-toolkit), managed with
  npm workspaces and Changesets. The original repositories have been archived.
  No runtime behaviour changes; published artifacts are equivalent to the prior
  standalone releases.

### Features

- 更新头文件名称 ui\_\_widgets.h -> LCUI/widgets.h ([78fac30](https://gitee.com/lcui-dev/react/commits/78fac308d625babff87c2f1ff892b33ed78f1b84))

# [0.4.0](https://gitee.com/lcui-dev/react/compare/v0.3.0...v0.4.0) (2024-12-22)

### Bug Fixes

- 结点名称与组件名称不一致 ([3cc733b](https://gitee.com/lcui-dev/react/commits/3cc733b5c869efb0c120c72057c1063f5afadae8))
- 指定 ref 属性后未正确生成对应结构体成员 ([a3b7920](https://gitee.com/lcui-dev/react/commits/a3b792036a4e7cfeaed0446f286127e804a1b93a))
- fmt() 函数生成的代码缺失必要头文件 ([efb4ea4](https://gitee.com/lcui-dev/react/commits/efb4ea456175964ed21eba800c889f51fe6816b5))

### Features

- 添加 ScrollArea 组件 ([bdbd870](https://gitee.com/lcui-dev/react/commits/bdbd870299aba7d54bc60a27aa1c4988a9d634e3))
- 添加 Scrollbar 组件 ([766ca91](https://gitee.com/lcui-dev/react/commits/766ca91ff8c1ce3fe7d60b3f88355557d08221c2))
- 支持用函数名称绑定事件处理器 ([31a38d6](https://gitee.com/lcui-dev/react/commits/31a38d65ec3065b7999581137dd2fe68a0755cbe))
- useState() 函数支持传入第二个参数指定值类型 ([ace2bc2](https://gitee.com/lcui-dev/react/commits/ace2bc2a84d99d45d7ab3b2813096afa2852446c))
