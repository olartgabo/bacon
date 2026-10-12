import { getActions, getNumberedDocs, getRecentLogs } from "@/lib/olympus";
import { Card, EmptyState } from "@/design/ui";
import { ExpandableRow } from "@/components/ExpandableRow";
import { Reveal } from "@/components/Reveal";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const { pending } = getActions();
  const tasks = getNumberedDocs("tasks");
  const decisions = getNumberedDocs("decisions");
  const logs = getRecentLogs(8);

  return (
    <Reveal>
      <main className="shell py-10">
        <header className="reveal mb-8">
          <h1 className="t-display">Today</h1>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="flex flex-col gap-6">
            <Card title="Tasks" count={tasks.length} className="reveal">
              {tasks.length === 0 ? (
                <EmptyState title="No tasks in olympus" />
              ) : (
                tasks.map((t) => (
                  <ExpandableRow key={t.slug} summary={t.title} meta={t.status ?? "—"} body={t.body} />
                ))
              )}
            </Card>

            <Card title="Decisions" count={decisions.length} className="reveal">
              {decisions.length === 0 ? (
                <EmptyState title="No decisions recorded" />
              ) : (
                decisions.map((d) => <ExpandableRow key={d.slug} summary={d.title} body={d.body} />)
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card title="Waiting on you" count={pending.length} className="reveal">
              {pending.length === 0 ? (
                <EmptyState title="Nothing pending" />
              ) : (
                pending.map((item, i) => (
                  <div key={i} className="task-row">
                    <span className="t-row text-ink-dim">{item.text}</span>
                  </div>
                ))
              )}
            </Card>

            <Card title="Recent logs" count={logs.length} className="reveal">
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
    </Reveal>
  );
}
