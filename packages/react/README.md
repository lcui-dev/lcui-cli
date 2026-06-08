# @lcui/react

([中文](README.zh-cn.md)/**English**)

A React library for LCUI application development, providing TypeScript type declarations and React version preset components that need to be used in conjunction with [@lcui/cli](https://github.com/lcui-dev/lcui-cli).

## Installation

```sh
npm install -D @lcui/react react @types/react
```

## Usage

```tsx
import { Text, TextInput } from '@lcui/react';
import styles from './app.module.css';

export default function App() {
  return (
    <div className={styles.app}>
      <Text>Hello, World!</Text>
      <TextInput placeholder="Please input..." />
    <div>
  );
}
```

LCUI is not a browser engine, and functions such as text display and input need to be implemented by specific components. Therefore, there may be the following differences in JSX writing:

```diff
  <div className={styles.app}>
-   Hello, World!
+   <Text>Hello, World!</Text>
-   <input placeholder="Please input..." />
+   <TextInput placeholder="Please input..." />
  <div>
```

## String event handlers

In LCUI projects an event handler can be the name of a C function instead of a
JavaScript callback. `@lcui/react` augments React's JSX types so that the
subset of `on*` event props that LCUI actually dispatches additionally
accepts `string`:

```tsx
<button onClick="handle_button_click">Run</button>
<button onDoubleClick="handle_button_dblclick">Run</button>
<TextInput onChange="handle_text_change" />
```

The `@lcui/cli` `ts-loader` recognises this form at compile time and emits, in
the generated header file:

```c
static void handle_button_click(ui_widget_t *w, ui_event_t *e, void *arg);
/* ... */
ui_widget_on(w, "click", handle_button_click, w);
```

You then provide the implementation of `handle_button_click` in your own `.c`
source file. JavaScript callbacks (`onClick={() => { ... }}`) keep working
unchanged and are still type-checked normally.

Covered props are derived from LCUI's `ui_event_type_t`:

- Mouse: `onClick`, `onDoubleClick`, `onMouseDown`, `onMouseUp`,
  `onMouseMove`, `onMouseOver`, `onMouseOut`, `onWheel`
- Keyboard: `onKeyDown`, `onKeyUp`, `onKeyPress`
- Focus: `onFocus`, `onBlur`
- Clipboard: `onPaste`
- Form: `onChange` (the semantic `"change"` event emitted by widgets such as
  `TextInput` after their value updates)

A few React names need to be remapped because LCUI uses a different name for
the same event. The React compiler handles this automatically:

- `onDoubleClick` → `"dblclick"`

Props for events LCUI does not dispatch (drag / pointer / animation /
transition / contextmenu / touch with mismatched names) and the
`SVGAttributes` namespace are intentionally **not** widened: passing a
string on those keeps failing type-checking so you do not end up with code
that compiles but cannot bind at runtime.

## License

[MIT](../../LICENSE)
