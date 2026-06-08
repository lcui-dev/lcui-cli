# @lcui/react

(**中文**/[English](README.md))

一个用于 LCUI 应用程序开发的 React 库，提供 TypeScript 类型声明、React 版预置组件，配合 [@lcui/cli](https://gitee.com/lcui-dev/lcui-cli) 使用。

## 安装

```sh
npm install -D @lcui/react
```

## 使用

```tsx
import { useState, useRef, TextInput, Button } from "@lcui/react";
import styles from "./app.module.css";

export default function App() {
  const inputRef = useRef();
  const [name, setName] = useState("World");

  return (
    <div className={styles.app}>
      Hello, {name}!
      <TextInput ref={inputRef} placeholder="Please input..." />
      <Button onClick={() => setName(inputRef.current.value)}>Change</Button>
    </div>
  );
}
```

LCUI 并不是浏览器引擎，像按钮、文本输入框等原生控件需要由特定的 LCUI 组件实现，因此，在 JSX 写法上会有如下差异：

```diff
  <div className={styles.app}>
    Hello, World!
-   <input placeholder="Please input..." />
+   <TextInput placeholder="Please input..." />
-   <button>Click here</button>
+   <Button>Click here</Button>
  <div>
```

## 字符串形态的事件处理器

在 LCUI 项目里，事件处理器可以直接是 C 函数名而不是 JavaScript 回调。
`@lcui/react` 对 React 的 JSX 类型做了类型扩展，让 LCUI 真正派发的那些
`on*` 事件属性额外接受 `string`：

```tsx
<button onClick="handle_button_click">Run</button>
<button onDoubleClick="handle_button_dblclick">Run</button>
<TextInput onChange="handle_text_change" />
```

`@lcui/cli` 的 ts-loader 在编译期识别这种写法，并在生成的头文件中产出：

```c
static void handle_button_click(ui_widget_t *w, ui_event_t *e, void *arg);
/* ... */
ui_widget_on(w, "click", handle_button_click, w);
```

`handle_button_click` 的实现需要你在配套的 `.c` 业务代码中自行编写。
传统的 JavaScript 回调写法（`onClick={() => { ... }}`）依然可用，类型检查
照旧。

覆盖范围来自 LCUI 的 `ui_event_type_t`：

- 鼠标：`onClick`、`onDoubleClick`、`onMouseDown`、`onMouseUp`、
  `onMouseMove`、`onMouseOver`、`onMouseOut`、`onWheel`
- 键盘：`onKeyDown`、`onKeyUp`、`onKeyPress`
- 焦点：`onFocus`、`onBlur`
- 剪贴板：`onPaste`
- 值变化：`onChange`（textinput 等 widget 在内部值更新后对外派发的语义
  事件 `"change"`）

有少数 React 习惯名与 LCUI 实际事件名不一致，React 编译器会自动重映射：

- `onDoubleClick` → `"dblclick"`

LCUI 不派发的事件（drag / pointer / animation / transition / contextmenu，
以及命名不一致的 touch 系列）以及 `SVGAttributes` 命名空间这里都**不**
放开 string——传字符串时 tsc 会直接报错，避免编出来跑不起来的代码。

## 许可

[MIT](../../LICENSE)
