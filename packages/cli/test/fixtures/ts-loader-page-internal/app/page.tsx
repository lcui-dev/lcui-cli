function Header() {
  return <div>header</div>;
}

function PageHeader() {
  return <div>page header</div>;
}

export default function Page() {
  return (
    <div>
      <Header />
      <PageHeader />
    </div>
  );
}