import { getActions, getNumberedDocs, getRecentLogs } from "@/lib/olympus";
import { Panel } from "@/components/Panel";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const { pending } = getActions();
  const tasks = getNumberedDocs("tasks");
  const decisions = getNumberedDocs("decisions");
  const logs = getRecentLogs(8);

  return (
    <main className="sheet-grid py-10 gap-y-8">
      <header className="col-span-12 flex items-baseline justify-between border-b border-object pb-4">
        <h1 className="t-label text-ink text-base tracking-normal">
          tasks.olartgabo.dev
        </h1>
        <span className="t-label text-ink-faint">read-only · olympus</span>
      </header>

      <div className="col-span-12 md:col-span-6 flex flex-col gap-4">
        <Panel title={`Pending (${pending.length})`}>
          {pending.length === 0 ? (
            <p className="t-label text-ink-faint">nothing pending</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pending.map((item, i) => (
                <li key={i} className="text-sm text-ink-dim">
                  <span className="text-red tnum mr-2">[ ]</span>
                  {item.text}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={`Recent logs (${logs.length})`}>
          <ul className="flex flex-col gap-3">
            {logs.map((entry, i) => (
              <li key={i} className="text-sm">
                <div className="t-label text-ink-faint">
                  {entry.device} · {entry.date}
                </div>
              </li>
            ))}
            {logs.length === 0 && (
              <p className="t-label text-ink-faint">no logs found</p>
            )}
          </ul>
        </Panel>
      </div>

      <div className="col-span-12 md:col-span-6 flex flex-col gap-4">
        <Panel title={`Tasks (${tasks.length})`}>
          <ul className="flex flex-col gap-2">
            {tasks.map((t) => (
              <li key={t.slug} className="text-sm text-ink-dim">
                <span className="t-label text-ink-faint mr-2">
                  {t.status ?? "—"}
                </span>
                {t.title}
              </li>
            ))}
            {tasks.length === 0 && (
              <p className="t-label text-ink-faint">no tasks found</p>
            )}
          </ul>
        </Panel>

        <Panel title={`Decisions (${decisions.length})`}>
          <ul className="flex flex-col gap-2">
            {decisions.map((d) => (
              <li key={d.slug} className="text-sm text-ink-dim">
                {d.title}
              </li>
            ))}
            {decisions.length === 0 && (
              <p className="t-label text-ink-faint">no decisions found</p>
            )}
          </ul>
        </Panel>
      </div>
    </main>
  );
}
