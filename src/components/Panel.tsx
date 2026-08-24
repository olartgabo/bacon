export function Panel({
  title,
  count,
  hint,
  children,
}: {
  title: string;
  count: number;
  /** Optional right-hand annotation, in the dimension-label register. */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel reveal">
      <header className="panel-header">
        <span className="t-label text-ink">{title}</span>
        <span className="flex items-baseline gap-3">
          {hint && <span className="t-label-sm text-ink-faint">{hint}</span>}
          <span className="t-label-sm tnum text-ink-faint">
            {String(count).padStart(2, "0")}
          </span>
        </span>
      </header>
      <div className="px-4 py-2">{children}</div>
    </section>
  );
}

/** The empty state every panel falls back to. Its own component so the
 * five panels can't drift into five slightly different "nothing here"s. */
export function PanelEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="t-label-sm py-2 text-ink-faint">{children}</p>
  );
}
