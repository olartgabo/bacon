import type { Metadata } from "next";
import { getActions, getNumberedDocs, getRecentLogs } from "@/lib/olympus";
import { Card, EmptyState } from "@/design/ui";
import { ExpandableRow } from "@/components/ExpandableRow";
import { staffCtx } from "@/lib/bacon/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Olympus" };

/** Read-only view of the olympus coordination repo. Tasks moved into
 * bacon; decisions, the human action list, and device logs still live in
 * Markdown there. */
export default async function OlympusPage() {
  await staffCtx();
  const { pending } = getActions();
  const decisions = getNumberedDocs("decisions");
  const logs = getRecentLogs(10);

  return (
    <main className="shell py-10">
      <header className="mb-8">
        <h1 className="t-display">Olympus</h1>
        <p className="t-meta mt-2">Read from the olympus repo checkout on the server.</p>
      </header>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Card title="Decisions" count={decisions.length}>
          {decisions.length === 0 ? (
            <EmptyState title="No decisions recorded" />
          ) : (
            decisions.map((d) => <ExpandableRow key={d.slug} summary={d.title} body={d.body} />)
          )}
        </Card>
        <div className="flex flex-col gap-6">
          <Card title="Waiting on Gabriel" count={pending.length}>
            {pending.length === 0 ? (
              <EmptyState title="Nothing pending in human/actions.md" />
            ) : (
              pending.map((item, i) => (
                <div key={i} className="task-row">
                  <span className="t-row text-ink-dim">{item.text}</span>
                </div>
              ))
            )}
          </Card>
          <Card title="Device logs" count={logs.length}>
            {logs.length === 0 ? (
              <EmptyState title="No device logs" />
            ) : (
              logs.map((entry, i) => (
                <ExpandableRow key={i} summary={entry.device} meta={entry.date} body={entry.body} />
              ))
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
