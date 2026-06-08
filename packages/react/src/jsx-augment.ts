/**
 * 让 React 的 JSX 事件处理器属性额外接受 `string`（C 函数名）。
 *
 * 背景：`@lcui/cli` 的 ts-loader 把字符串形态的事件处理器视为 C 函数名，
 * 在生成的 .h 里产出 `static void <name>(ui_widget_t*, ui_event_t*, void*);`
 * 的前向声明以及对应的 `ui_widget_on(...)` 绑定。运行时一直能工作，但
 * React 把 `onClick` 等声明为 `MouseEventHandler<T> | undefined`，直接给
 * string 会触发类型错误。
 *
 * 实现细节：在父接口 `DOMAttributes<T>` 上直接加宽 `onClick` 会触发 TS2717
 * （同名属性必须类型相同）。但 `HTMLAttributes<T>` 是 `DOMAttributes<T>`
 * 的子接口；TS 允许子接口的"自有属性"覆盖（加宽）从父接口继承来的同名
 * 属性。所以我们在 HTMLAttributes 里**直接重新声明**这些 on* 属性，不要
 * 通过 `extends` 引入——那样会变成多父接口交集，加宽失效。
 *
 * 现代 `@types/react` 与 `"jsx": "react"|"react-jsx"` 下所有 intrinsic
 * 元素的 props 都通过 HTMLAttributes 暴露，从而让 `<button onClick="..."/>`
 * 通过类型检查。
 *
 * 范围：仅覆盖 **LCUI 真正会派发**的事件。多数事件 ts-loader 默认的
 * `onXxx → "xxx"` 规则即可命中 LCUI 事件名；少数事件名不一致的情况
 * （如 React `onDoubleClick → "doubleclick"` vs LCUI `"dblclick"`）由
 * `@lcui/react` 编译器内部的事件名映射表（compile.ts 中的
 * `REACT_TO_LCUI_EVENT_NAME`）做翻译，因此这里依然安全地放开 string。
 *
 * `onChange` 在 LCUI 中是 widget 派发的语义事件（例如 textinput widget
 * 内部消化 `UI_EVENT_TEXTINPUT` 后对外派发 `"change"`），任何遵循同一
 * 约定的自定义 widget 都可以使用，因此这里在通用 HTMLAttributes 上放开。
 *
 * LCUI 不派发的事件（drag / pointer / animation / transition / contextmenu
 * 等浏览器特有事件）不在此放开 string，保留 React 原类型——用户传字符串时
 * tsc 会直接报错，避免编出来跑不起来的代码。LCUI 不支持 SVG，因此也不
 * 扩展 `SVGAttributes`。
 */

import * as React from "react";

/**
 * LCUI 派发、且属性名经过 ts-loader / @lcui/react compile 转换后能正确落到
 * LCUI 事件名的事件子集。
 *
 * 与 LCUI `ui_event_type_t` 的对应关系：
 * - onFocus        ↔ UI_EVENT_FOCUS / "focus"
 * - onBlur         ↔ UI_EVENT_BLUR / "blur"
 * - onKeyDown      ↔ UI_EVENT_KEYDOWN / "keydown"
 * - onKeyUp        ↔ UI_EVENT_KEYUP / "keyup"
 * - onKeyPress     ↔ UI_EVENT_KEYPRESS / "keypress"
 * - onMouseMove    ↔ UI_EVENT_MOUSEMOVE / "mousemove"
 * - onMouseDown    ↔ UI_EVENT_MOUSEDOWN / "mousedown"
 * - onMouseUp      ↔ UI_EVENT_MOUSEUP / "mouseup"
 * - onMouseOver    ↔ UI_EVENT_MOUSEOVER / "mouseover"
 * - onMouseOut     ↔ UI_EVENT_MOUSEOUT / "mouseout"
 * - onWheel        ↔ UI_EVENT_WHEEL / "wheel"
 * - onClick        ↔ UI_EVENT_CLICK / "click"
 * - onDoubleClick  ↔ UI_EVENT_DBLCLICK / "dblclick"（编译期由 @lcui/react 重映射）
 * - onPaste        ↔ UI_EVENT_PASTE / "paste"
 * - onChange       ↔ "change"（widget 自定义；textinput 等 widget 在内部值变化后派发）
 */
interface LCUIStringEventProps<T> {
  onFocus?: React.FocusEventHandler<T> | string;
  onBlur?: React.FocusEventHandler<T> | string;
  onKeyDown?: React.KeyboardEventHandler<T> | string;
  onKeyUp?: React.KeyboardEventHandler<T> | string;
  onKeyPress?: React.KeyboardEventHandler<T> | string;
  onMouseMove?: React.MouseEventHandler<T> | string;
  onMouseDown?: React.MouseEventHandler<T> | string;
  onMouseUp?: React.MouseEventHandler<T> | string;
  onMouseOver?: React.MouseEventHandler<T> | string;
  onMouseOut?: React.MouseEventHandler<T> | string;
  onWheel?: React.WheelEventHandler<T> | string;
  onClick?: React.MouseEventHandler<T> | string;
  onDoubleClick?: React.MouseEventHandler<T> | string;
  onPaste?: React.ClipboardEventHandler<T> | string;
  onChange?: React.FormEventHandler<T> | string;
}

declare module "react" {
  interface HTMLAttributes<T> {
    onFocus?: React.FocusEventHandler<T> | string;
    onBlur?: React.FocusEventHandler<T> | string;
    onKeyDown?: React.KeyboardEventHandler<T> | string;
    onKeyUp?: React.KeyboardEventHandler<T> | string;
    onKeyPress?: React.KeyboardEventHandler<T> | string;
    onMouseMove?: React.MouseEventHandler<T> | string;
    onMouseDown?: React.MouseEventHandler<T> | string;
    onMouseUp?: React.MouseEventHandler<T> | string;
    onMouseOver?: React.MouseEventHandler<T> | string;
    onMouseOut?: React.MouseEventHandler<T> | string;
    onWheel?: React.WheelEventHandler<T> | string;
    onClick?: React.MouseEventHandler<T> | string;
    onDoubleClick?: React.MouseEventHandler<T> | string;
    onPaste?: React.ClipboardEventHandler<T> | string;
    onChange?: React.FormEventHandler<T> | string;
  }
}

// 仅暴露给文档/类型系统的辅助类型；不导出运行时值
export type { LCUIStringEventProps };
