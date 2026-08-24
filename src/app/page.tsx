import { getActions, getNumberedDocs, getRecentLogs } from "@/lib/olympus";
import { SPACES } from "@/lib/spaces";
import { db } from "@/lib/db/client";
import { captures as capturesTable } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Panel, PanelEmpty } from "@/components/Panel";
import { Frame } from "@/components/Frame";
import { SpaceTile } from "@/components/SpaceTile";
import { ExpandableRow } from "@/components/ExpandableRow";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CaptureForm } from "@/components/CaptureForm";
import { Reveal } from "@/components/Reveal";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const { pending } = getActions();
  const tasks = getNumberedDocs("tasks");
  const decisions = getNumberedDocs("decisions");
  const logs = getRecentLogs(8);
  const captures = db
    .select()
    .from(capturesTable)
    .orderBy(desc(capturesTable.id))
    .limit(10)
    .all();

  const unsynced = captures.filter((c) => !c.synced).length;

  return (
    <>
      <Frame />
      <Reveal>
        <main className="mx-auto max-w-[90rem] px-[var(--frame)] py-10">
          {/* Masthead. One display-size element on the sheet, per the
              portfolio's rule — everything else is label register. */}
          <header className="sheet-grid mb-10 border-b border-object pb-5">
            <div className="reveal col-span-12 flex items-end justify-between gap-4 md:col-span-7">
              <div>
                <span className="t-label-sm block text-red">SHEET 01</span>
                <h1 className="t-display mt-1.5 text-ink">Tasks</h1>
              </div>
            </div>
            <div className="reveal col-span-12 mt-4 flex items-end justify-between gap-4 md:col-span-5 md:mt-0">
              <dl className="grid grid-cols-3 gap-x-5 gap-y-1">
                <Stat label="Open" value={tasks.length} />
                <Stat label="Pending" value={pending.length} />
                <Stat label="Unsynced" value={unsynced} accent={unsynced > 0} />
              </dl>
              <ThemeToggle />
            </div>
          </header>

          {/* Capture is the only thing you *do* on this sheet, so it sits
              above the readouts and spans the reading column. */}
          <section className="sheet-grid mb-10">
            <div className="reveal col-span-12 lg:col-span-8">
              <span className="t-label-sm mb-2 block text-ink-faint">
                Capture
              </span>
              <CaptureForm />
            </div>
          </section>

          <section className="sheet-grid mb-10">
            <div className="reveal col-span-12 mb-3 flex items-baseline gap-3 border-b border-constr pb-2">
              <span className="t-label text-ink">Spaces</span>
              <span className="t-label-sm tnum text-ink-faint">
                {String(SPACES.length).padStart(2, "0")}
              </span>
            </div>
            <div className="col-span-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
              {SPACES.map((space, i) => (
                <SpaceTile key={space.slug} space={space} index={i} />
              ))}
            </div>
          </section>

          {/* Asymmetric on purpose: Tasks is the sheet's subject and gets
              the wide column; the ledger panels stack narrow beside it. */}
          <section className="sheet-grid gap-y-6">
            <div className="col-span-12 flex flex-col gap-6 lg:col-span-7">
              <Panel title="Tasks" count={tasks.length} hint="olympus/tasks">
                {tasks.length === 0 ? (
                  <PanelEmpty>no tasks found</PanelEmpty>
                ) : (
                  tasks.map((t) => (
                    <ExpandableRow
                      key={t.slug}
                      summary={t.title}
                      meta={t.status ?? "—"}
                      body={t.body}
                    />
                  ))
                )}
              </Panel>

              <Panel
                title="Decisions"
                count={decisions.length}
                hint="olympus/decisions"
              >
                {decisions.length === 0 ? (
                  <PanelEmpty>no decisions found</PanelEmpty>
                ) : (
                  decisions.map((d) => (
                    <ExpandableRow
                      key={d.slug}
                      summary={d.title}
                      body={d.body}
                    />
                  ))
                )}
              </Panel>
            </div>

            <div className="col-span-12 flex flex-col gap-6 lg:col-span-5">
              <Panel
                title="Captures"
                count={captures.length}
                hint={unsynced > 0 ? `${unsynced} unsynced` : "all synced"}
              >
                {captures.length === 0 ? (
                  <PanelEmpty>nothing captured yet</PanelEmpty>
                ) : (
                  <dl>
                    {captures.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-baseline gap-3 border-b border-constr py-2 last:border-b-0"
                      >
                        <dt
                          className={`t-label-sm shrink-0 ${
                            c.synced ? "text-ink-faint" : "text-red"
                          }`}
                        >
                          {c.synced ? "synced" : "pending"}
                        </dt>
                        <dd className="t-row min-w-0 flex-1 truncate text-ink-dim">
                          {c.title}
                        </dd>
                        <span className="t-label-sm shrink-0 text-ink-faint">
                          {c.domain}
                        </span>
                      </div>
                    ))}
                  </dl>
                )}
              </Panel>

              <Panel
                title="Pending"
                count={pending.length}
                hint="human/actions"
              >
                {pending.length === 0 ? (
                  <PanelEmpty>nothing pending</PanelEmpty>
                ) : (
                  <dl>
                    {pending.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-baseline gap-3 border-b border-constr py-2 last:border-b-0"
                      >
                        <dt className="t-label-sm shrink-0 text-red">—</dt>
                        <dd className="t-row text-ink-dim">{item.text}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </Panel>

              <Panel title="Recent logs" count={logs.length} hint="olympus/logs">
                {logs.length === 0 ? (
                  <PanelEmpty>no logs found</PanelEmpty>
                ) : (
                  logs.map((entry, i) => (
                    <ExpandableRow
                      key={i}
                      summary={entry.device}
                      meta={entry.date}
                      body={entry.body}
                    />
                  ))
                )}
              </Panel>
            </div>
          </section>

          <footer className="sheet-grid mt-12 border-t border-constr pt-4">
            <span className="t-label-sm col-span-12 text-ink-faint">
              olympus · captures write local, sync manual
            </span>
          </footer>
        </main>
      </Reveal>
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div>
      <dt className="t-label-sm text-ink-faint">{label}</dt>
      <dd
        className={`t-row tnum mt-0.5 ${accent ? "text-red" : "text-ink-dim"}`}
      >
        {String(value).padStart(2, "0")}
      </dd>
    </div>
  );
}
