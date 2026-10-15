import type { Metadata } from "next";
import { createRequestAction } from "@/app/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { TaskList } from "@/components/TaskList";
import { Card, FieldLabel, Input, Textarea } from "@/design/ui";
import { TASK_STATUSES } from "@/lib/bacon/model";
import { listTasks } from "@/lib/bacon/service";
import { anyCtx } from "@/lib/bacon/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Requests" };

export default async function RequestPage() {
  const ctx = await anyCtx();
  const mine = listTasks(ctx, {
    status: [...TASK_STATUSES],
    createdBy: ctx.actor.kind === "requester" ? undefined : "me",
  });

  return (
    <main className="shell py-10">
      <header className="mb-8">
        <h1 className="t-display">Ask Gabriel</h1>
        <p className="t-meta mt-2 max-w-[60ch]">
          File a request and follow it here. You will see when it is accepted, any replies, and when it is done.
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card title="New request">
          <ActionForm action={createRequestAction} className="flex flex-col gap-3 py-4">
            <div>
              <FieldLabel htmlFor="req-title">What do you need?</FieldLabel>
              <Input id="req-title" name="title" required maxLength={200} />
            </div>
            <div>
              <FieldLabel htmlFor="req-body">Details, links, context</FieldLabel>
              <Textarea id="req-body" name="body" rows={6} />
            </div>
            <div>
              <FieldLabel htmlFor="req-due">Needed by (optional)</FieldLabel>
              <Input id="req-due" name="due" type="date" className="sm:w-48" />
            </div>
            <div>
              <Submit>Send request</Submit>
            </div>
          </ActionForm>
        </Card>

        <Card title="Your requests" count={mine.length}>
          <TaskList tasks={mine} empty="You have not filed any requests yet" hideSpace hrefBase="/request" />
        </Card>
      </div>
    </main>
  );
}
