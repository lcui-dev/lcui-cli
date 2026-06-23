function MyWidget() {
  return <div>custom</div>;
}
MyWidget.displayName = "custom_widget_name";

export function AnotherWidget() {
  return <div>another</div>;
}

export default function WidgetsApp() {
  return (
    <div>
      <MyWidget />
      <AnotherWidget />
    </div>
  );
}
