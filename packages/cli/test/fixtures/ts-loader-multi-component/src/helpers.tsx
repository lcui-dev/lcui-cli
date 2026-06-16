function MyButton() {
  return <div>Button</div>;
}

export function Card() {
  return <div>Card</div>;
}

export default function App() {
  return (
    <div>
      Hello
      <Card />
      <MyButton />
    </div>
  );
}