import { createTagWidget } from "./factory.js";
import type { LinkProps, TextInputProps, WidgetBaseProps, WidgetProps } from "./types.js";

export const Text = createTagWidget<WidgetBaseProps>("text");
export const TextInput = createTagWidget<TextInputProps>("textinput");
export const Link = createTagWidget<LinkProps>("a");
export const Button = createTagWidget<WidgetBaseProps>("button");
export const Widget = createTagWidget<WidgetProps>("widget");
