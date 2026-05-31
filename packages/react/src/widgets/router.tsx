import React from "react";
import { createTagWidget, withWidgetMeta } from "./factory.js";
import type { FunctionWidget, RouterLinkProps, RouterViewProps } from "./types.js";

export const RouterLink: FunctionWidget<RouterLinkProps> = withWidgetMeta(
  ({ exact, to, activeClass = "", exactActiveClass = "", ...otherProps }: RouterLinkProps) => {
    const props = {
      to,
      "active-class": activeClass,
      exact: exact ? "exact" : "",
      "exact-active-class": exactActiveClass,
      ...otherProps,
    } as const;
    return <router-link {...props} />;
  }
);

export const RouterView = createTagWidget<RouterViewProps>("router-view");
