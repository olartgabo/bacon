import type { Metadata } from "next";
import { TaskList } from "@/components/TaskList";
import { Button, Card, Input, Tabs } from "@/design/ui";
import { CLOSED_STATUSES, SPACES, SPACE_LABEL, TASK_STATUSES, type Space, type TaskStatus } from "@/lib/bacon/model";
import { listTasks } from "@/lib/bacon/service";
import { staffCtx } from "@/lib/bacon/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tasks" };

const VIEWS = {
  open: { label: "Open", statuses: TASK_STATUSES.filter((s) => !CLOSED_STATUSES.includes(s)) },
  closed: { label: "Closed", statuses: [...CLOSED_STATUSES] },
  all: { label: "All", statuses: [...TASK_STATUSES] },
} satisfies Record<string, { label: string; statuses: TaskStatus[] }>;
type View = keyof typeof VIEWS;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ space?: string; view?: string; q?: string }>;
}) {
  const ctx = await staffCtx();
  const params = await searchParams;
  const space = SPACES.includes(params.space as Space) ? (params.space as Space) : undefined;
  const view: View = params.view && params.view in VIEWS ? (params.view as View) : "open";
  const q = params.q?.trim() || undefined;

  const tasks = listTasks(ctx, { space, status: VIEWS[view].statuses, q, limit: 200 });

  const href = (next: { space?: Space; view?: View }) => {
    const sp = new URLSearchParams();
    const s = "space" in next ? next.space : space;
    const v = next.view ?? view;
    if (s) sp.set("space", s);
    if (v !== "open") sp.set("view", v);
    if (q) sp.set("q", q);
    const qs = sp.toString();
    return qs ? `/tasks?${qs}` : "/tasks";
  };
  const current = href({});

  return (
    <main className="shell py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="t-display">{space ? SPACE_LABEL[space] : "Tasks"}</h1>
        <form className="flex w-full gap-2 sm:w-auto" action="/tasks">
          {space && <input type="hidden" name="space" value={space} />}
          {view !== "open" && <input type="hidden" name="view" value={view} />}
          <label className="sr-only" htmlFor="task-search">
            Search
          </label>
          <Input id="task-search" name="q" defaultValue={q} placeholder="Search titles and bodies" className="sm:w-64" />
          <Button type="submit">Search</Button>
        </form>
      </header>

      <div className="mb-4 flex flex-col gap-3">
        <Tabs
          label="Space"
          current={current}
          items={[
            { href: href({ space: undefined }), label: "All spaces" },
            ...SPACES.map((s) => ({ href: href({ space: s }), label: SPACE_LABEL[s] })),
          ]}
        />
        <Tabs
          label="Status"
          current={current}
          items={(Object.keys(VIEWS) as View[]).map((v) => ({ href: href({ view: v }), label: VIEWS[v].label }))}
        />
      </div>

      <Card title={q ? `Matching “${q}”` : "Tasks"} count={tasks.length}>
        <TaskList tasks={tasks} empty="No tasks match" hideSpace={Boolean(space)} />
      </Card>
    </main>
  );
}
