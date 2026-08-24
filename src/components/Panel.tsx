export function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-object bg-sheet-raised rounded-sm">
      <header className="t-label text-ink-faint border-b border-object px-4 py-2">
        {title}
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}
