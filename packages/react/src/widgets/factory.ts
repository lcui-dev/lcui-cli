import React from "react";
import type { FunctionWidget, WidgetBaseProps } from "./types.js";

export function withWidgetMeta<T extends WidgetBaseProps>(
  render: (props: T) => React.ReactElement
): FunctionWidget<T> {
  const widget = ((props: T) => render(props)) as FunctionWidget<T>;
  widget.shouldPreRender = true;
  return widget;
}

export function createTagWidget<T extends WidgetBaseProps>(tag: string): FunctionWidget<T> {
  return withWidgetMeta((props: T) => React.createElement(tag, props));
}
