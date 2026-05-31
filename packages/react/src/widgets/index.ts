// Side-effect import: ensures the `declare module "react"` block in
// ./types.ts is loaded, so LCUI's intrinsic JSX elements
// (widget, router-link, scrollarea, ...) are typed when this barrel
// (or `@lcui/react/widgets`) is imported.
import "./types.js";

export * from "./types.js";
export * from "./base.js";
export * from "./scroll.js";
export * from "./router.js";
