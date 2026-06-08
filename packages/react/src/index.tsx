/// <reference path="../types.d.ts" />

import "./jsx-augment.js";

import React from "react";

export * from "./compiler/index.js";
export * from "./widgets/index.js";
export { default as fmt } from "./runtime/fmt.js";
export { default as useState } from "./runtime/useState.js";
export { default as useRef } from "./runtime/useRef.js";

export type { PropsWithChildren, ReactNode, ReactElement } from "react";

export { createElement, Fragment } from "react";

export default React;
