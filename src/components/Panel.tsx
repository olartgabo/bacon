export function Panel({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-object">
      <header className="flex items-baseline justify-between border-b border-object px-4 py-2">
        <span className="t-label-sm text-ink-faint/70">{title}</span>
        <span className="t-label-sm tabular-nums text-ink-faint/70">
          {String(count).padStart(2, "0")}
        </span>
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}
