import { getActions, getNumberedDocs, getRecentLogs } from "@/lib/olympus";
import { SPACES } from "@/lib/spaces";
import { Panel } from "@/components/Panel";
import { Frame } from "@/components/Frame";
import { SpaceTile } from "@/components/SpaceTile";
import { ExpandableRow } from "@/components/ExpandableRow";
import { ThemeToggle } from "@/components/ThemeToggle";

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
          <div className="col-span-4 flex items-center justify-end gap-4">
            <span className="t-label text-ink-faint">read-only · olympus</span>
            <ThemeToggle />
          </div>
        </div>

        <div className="sheet-grid mb-10">
          <div className="col-span-12 mb-3 flex items-baseline gap-3">
            <span className="t-label-sm text-ink-faint/70">Spaces</span>
            <span className="t-label-sm tabular-nums text-ink-faint/70">
              {String(SPACES.length).padStart(2, "0")}
            </span>
          </div>
          <div className="col-span-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            {SPACES.map((space) => (
              <SpaceTile key={space.slug} space={space} />
            ))}
          </div>
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
                <div>
                  {logs.map((entry, i) => (
                    <ExpandableRow
                      key={i}
                      summary={entry.device}
                      meta={entry.date}
                      body={entry.body}
                    />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="col-span-12 flex flex-col gap-6 md:col-span-6">
            <Panel title="Tasks" count={tasks.length}>
              {tasks.length === 0 ? (
                <p className="t-label text-ink-faint">no tasks found</p>
              ) : (
                <div>
                  {tasks.map((t) => (
                    <ExpandableRow
                      key={t.slug}
                      summary={t.title}
                      meta={t.status ?? "—"}
                      body={t.body}
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Decisions" count={decisions.length}>
              {decisions.length === 0 ? (
                <p className="t-label text-ink-faint">no decisions found</p>
              ) : (
                <div>
                  {decisions.map((d) => (
                    <ExpandableRow key={d.slug} summary={d.title} body={d.body} />
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </main>
    </>
  );
}
