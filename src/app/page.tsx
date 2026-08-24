import { getActions, getNumberedDocs, getRecentLogs } from "@/lib/olympus";
import { Panel } from "@/components/Panel";
import { Frame } from "@/components/Frame";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const { pending } = getActions();
  const tasks = getNumberedDocs("tasks");
  const decisions = getNumberedDocs("decisions");
  const logs = getRecentLogs(8);

  return (
    <>
      <Frame />
      <main className="mx-auto max-w-[90rem] px-[var(--frame)] py-10">
        <div className="sheet-grid mb-8 items-baseline border-b border-object pb-4">
          <div className="col-span-8 flex items-baseline gap-4">
            <span className="t-label text-red">SHEET 01</span>
            <span className="t-label text-ink-faint">
              tasks.olartgabo.dev
            </span>
          </div>
          <span className="t-label col-span-4 text-right text-ink-faint">
            read-only · olympus
          </span>
        </div>

        <div className="sheet-grid gap-y-6">
          <div className="col-span-12 flex flex-col gap-6 md:col-span-6">
            <Panel title="Pending" count={pending.length}>
              {pending.length === 0 ? (
                <p className="t-label text-ink-faint">nothing pending</p>
              ) : (
                <dl>
                  {pending.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-baseline gap-3 border-b border-constr py-1.5 last:border-b-0"
                    >
                      <dt className="t-label text-red">—</dt>
                      <dd className="t-label text-ink-dim">{item.text}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Panel>

            <Panel title="Recent logs" count={logs.length}>
              {logs.length === 0 ? (
                <p className="t-label text-ink-faint">no logs found</p>
              ) : (
                <dl>
                  {logs.map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-baseline gap-3 border-b border-constr py-1.5 last:border-b-0"
                    >
                      <dt className="t-label text-ink">{entry.device}</dt>
                      <dd className="t-label ml-auto text-right text-ink-faint">
                        {entry.date}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </Panel>
          </div>

          <div className="col-span-12 flex flex-col gap-6 md:col-span-6">
            <Panel title="Tasks" count={tasks.length}>
              {tasks.length === 0 ? (
                <p className="t-label text-ink-faint">no tasks found</p>
              ) : (
                <dl>
                  {tasks.map((t) => (
                    <div
                      key={t.slug}
                      className="flex items-baseline gap-3 border-b border-constr py-1.5 last:border-b-0"
                    >
                      <dt className="t-label-sm shrink-0 text-ink-faint/70">
                        {t.status ?? "—"}
                      </dt>
                      <dd className="t-label text-ink-dim">{t.title}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Panel>

            <Panel title="Decisions" count={decisions.length}>
              {decisions.length === 0 ? (
                <p className="t-label text-ink-faint">no decisions found</p>
              ) : (
                <dl>
                  {decisions.map((d) => (
                    <div
                      key={d.slug}
                      className="flex items-baseline gap-3 border-b border-constr py-1.5 last:border-b-0"
                    >
                      <dd className="t-label text-ink-dim">{d.title}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Panel>
          </div>
        </div>
      </main>
    </>
  );
}
