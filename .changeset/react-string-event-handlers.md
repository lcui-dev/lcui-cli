---
"@lcui/react": minor
---

feat(react): allow string C-function names on JSX event props

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
