import { createTagWidget } from "./factory.js";
import type { ScrollbarProps, WidgetBaseProps } from "./types.js";

export const Scrollbar = createTagWidget<ScrollbarProps>("scrollbar");
export const ScrollArea = createTagWidget<WidgetBaseProps>("scrollarea");
export const ScrollAreaContent = createTagWidget<WidgetBaseProps>("scrollarea-content");
