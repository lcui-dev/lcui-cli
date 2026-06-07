import { Text, Widget } from "@lcui/react";

function Icon() {
  return <text className="fui-icon">{"\uF000"}</text>;
}

export default function Widget0() {
  return (
    <Widget className="code-block" onClick="handle_on_click">
      <Text>Copy</Text>
      <Icon />
    </Widget>
  );
}
