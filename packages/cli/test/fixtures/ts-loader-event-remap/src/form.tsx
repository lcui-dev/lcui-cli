import { TextInput } from "@lcui/react";

export default function Form() {
  return (
    <div>
      <button onDoubleClick="handle_button_dbl">OK</button>
      <TextInput onChange="handle_text_change" />
    </div>
  );
}
