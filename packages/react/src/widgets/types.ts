import type React from "react";

export interface WidgetBaseAttributes {
  $ref?: string | { name: string; current: any };
  className?: string;
  children?: any;
  [x: string]: any;
}

export interface WidgetAttributes extends WidgetBaseAttributes {
  type?: string;
}

export interface LinkAttributes extends WidgetBaseAttributes {
  href?: string;
}

export interface TextInputAttributes extends WidgetBaseAttributes {
  placeholder?: string;
  /**
   * 文本变化事件。textinput widget 在内部消化用户输入（`UI_EVENT_TEXTINPUT`）
   * 并更新文本内容后，对外派发 `"change"` 事件。
   *
   * 值既可以是 React 风格的 form 事件回调，也可以是 C 函数名（string）。
   */
  onChange?: React.FormEventHandler<HTMLElement> | string;
}

export interface ScrollbarAttributes extends WidgetBaseAttributes {
  orientation?: "horizontal" | "vertical";
}

export interface RouterLinkAttributes extends WidgetBaseAttributes {
  to: string;
  exact?: "exact" | "";
  "exact-active-class"?: string;
  "active-class"?: string;
}

export interface RouterViewAttributes extends WidgetBaseAttributes {
  /** @see https://router.vuejs.org/zh/guide/essentials/named-views.html */
  name?: string;
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      widget: WidgetAttributes;
      textinput: TextInputAttributes;
      scrollbar: ScrollbarAttributes;
      scrollarea: WidgetBaseAttributes;
      "scrollarea-content": WidgetBaseAttributes;
      "router-link": RouterLinkAttributes;
      "router-view": RouterViewAttributes;
    }
  }
}

export type WidgetProps = WidgetAttributes;
export type WidgetBaseProps = WidgetBaseAttributes;
export type LinkProps = LinkAttributes;
export type RouterViewProps = RouterViewAttributes;
export type ScrollbarProps = ScrollbarAttributes;

export type FunctionWidget<T = WidgetBaseProps> = ((props: T) => React.ReactElement) & {
  shouldPreRender?: boolean;
};

export interface RouterLinkProps extends WidgetBaseProps {
  to: string;
  exact?: boolean;
  exactActiveClass?: string;
  activeClass?: string;
}

export interface TextInputProps extends WidgetBaseProps {
  placeholder?: string;
  /** 同 TextInputAttributes.onChange，详见其 JSDoc。 */
  onChange?: React.FormEventHandler<HTMLElement> | string;
}
