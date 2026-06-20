export default function List() {
  const items = ["a", "b", "c"];
  return (
    <div>
      {items.map((x) => (
        <div>{x}</div>
      ))}
    </div>
  );
}
