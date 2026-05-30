import React from "react";
import * as rt from "react/jsx-runtime";
import { ObjectBinding, isObjectBinding } from "./binding.js";

type JSXFactor = (
  type: React.ElementType,
  props: Record<string, any>,
  key?: React.Key
) => React.ReactElement;

export function JSXObjectBinding({ value }: { value: ObjectBinding }) {
  return `[JSXObjectBinding ${value.__meta__.name}]`;
}

function transformReactChild(child: any) {
  if (child && isObjectBinding(child)) {
    return React.createElement(JSXObjectBinding, { value: child });
  }
  return child;
}

function transformElementProps(props: Record<string, any>) {
  if (props && props.children) {
    return {
      ...props,
      children: Array.isArray(props.children)
        ? props.children.map(transformReactChild)
        : transformReactChild(props.children),
    };
  }
  return props;
}

export const jsx: JSXFactor = (type, props, key) =>
  (rt as unknown as { jsx: JSXFactor }).jsx(type, transformElementProps(props), key);

export const jsxs: JSXFactor = (type, props, key) =>
  (rt as unknown as { jsxs: JSXFactor }).jsxs(
    type,
    transformElementProps(props),
    key
  );
