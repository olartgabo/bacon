import ReactMarkdown from "react-markdown";

/** A panel row whose body is worth reading in full — expands in place
 * instead of navigating away, since this dashboard has no doc viewer. */
export function ExpandableRow({
  summary,
  meta,
  body,
}: {
  summary: React.ReactNode;
  meta?: React.ReactNode;
  body: string;
}) {
  return (
    <details className="row-interactive border-b border-constr last:border-b-0">
      <summary className="flex items-baseline gap-3 px-0 py-1.5">
        <span className="t-label text-ink-dim">{summary}</span>
        {meta && (
          <span className="t-label-sm ml-auto shrink-0 text-ink-faint">
            {meta}
          </span>
        )}
      </summary>
      <div className="prose-sheet pb-3 pl-0">
        <ReactMarkdown>{body}</ReactMarkdown>
      </div>
    </details>
  );
}
