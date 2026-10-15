import { createTaskAction } from "./actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { TaskList } from "@/components/TaskList";
import { Card, Input, Select } from "@/design/ui";
import { PRIORITIES, SPACES, SPACE_LABEL } from "@/lib/bacon/model";
import { listTasks } from "@/lib/bacon/service";
import { staffCtx } from "@/lib/bacon/session";

export const dynamic = "force-dynamic";

function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export default async function TodayPage() {
  const ctx = await staffCtx();
  const inProgress = listTasks(ctx, { status: ["in-progress"] });
  const upNext = listTasks(ctx, { status: ["open"], limit: 15 });
  const dueSoon = listTasks(ctx, { status: ["open", "in-progress", "blocked", "waiting"], dueBefore: inDays(7) });
  const stuck = listTasks(ctx, { status: ["blocked", "waiting"] });

  return (
    <main className="shell py-10">
      <header className="mb-6">
        <h1 className="t-display">Today</h1>
      </header>

      <ActionForm action={createTaskAction} className="mb-8 max-w-3xl">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="quick-title">
            New task
          </label>
          <Input id="quick-title" name="title" placeholder="Add a task…" required autoComplete="off" />
          <label className="sr-only" htmlFor="quick-space">
            Space
          </label>
          <Select id="quick-space" name="space" defaultValue="" className="sm:w-52">
            <option value="">Inbox (no space)</option>
            {SPACES.map((s) => (
              <option key={s} value={s}>
                {SPACE_LABEL[s]}
              </option>
            ))}
          </Select>
          <label className="sr-only" htmlFor="quick-priority">
            Priority
          </label>
          <Select id="quick-priority" name="priority" defaultValue="normal" className="sm:w-32">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <Submit>Add</Submit>
        </div>
      </ActionForm>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex flex-col gap-6">
          <Card title="In progress" count={inProgress.length}>
            <TaskList tasks={inProgress} empty="Nothing in progress" />
          </Card>
          <Card title="Up next" count={upNext.length}>
            <TaskList tasks={upNext} empty="No open tasks" />
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Due this week" count={dueSoon.length}>
            <TaskList tasks={dueSoon} empty="Nothing due in the next 7 days" />
          </Card>
          <Card title="Blocked or waiting" count={stuck.length}>
            <TaskList tasks={stuck} empty="Nothing stuck" />
          </Card>
        </div>
      </div>
    </main>
  );
}
