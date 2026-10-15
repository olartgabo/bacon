import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  commentAction,
  completeAction,
  decideApprovalAction,
  releaseAction,
  updateTaskAction,
} from "@/app/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Timeline } from "@/components/Timeline";
import { Badge, Card, FieldLabel, Input, PriorityBadge, Select, StatusBadge, Textarea, formatWhen } from "@/design/ui";
import { taskRef } from "@/lib/bacon/inputs";
import { PRIORITIES, SPACES, SPACE_LABEL, STATUS_LABEL, TASK_STATUSES } from "@/lib/bacon/model";
import { BaconError, getTask, listAssignees, type TaskDetail } from "@/lib/bacon/service";
import { staffCtx } from "@/lib/bacon/session";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ ref: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await params).ref.toUpperCase() };
}

export default async function TaskPage({ params }: Props) {
  const ctx = await staffCtx();
  const parsed = taskRef.safeParse((await params).ref);
  if (!parsed.success) notFound();

  let detail: TaskDetail;
  try {
    detail = getTask(ctx, parsed.data, 200);
  } catch (err) {
    if (err instanceof BaconError && err.code === "not_found") notFound();
    throw err;
  }
  const { task, events, approvals } = detail;
  const assignees = listAssignees(ctx);
  const isOwner = ctx.actor.kind === "owner";
  const closed = task.status === "done" || task.status === "canceled";

  return (
    <main className="shell py-10">
      <header className="mb-8">
        <p className="ref">{task.ref}</p>
        <h1 className="t-display mt-1">{task.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
          {task.priority !== "normal" && <PriorityBadge priority={task.priority} />}
          {approvals.some((a) => a.state === "pending") && <Badge tone="approval">needs approval</Badge>}
          <span className="t-meta">
            {task.space ? SPACE_LABEL[task.space] : "Inbox"} · filed by {task.createdBy} via {task.source}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Card title="Description">
            <div className="py-4">
              {task.body.trim() ? (
                <div className="prose">
                  <ReactMarkdown>{task.body}</ReactMarkdown>
                </div>
              ) : (
                <p className="t-meta">No description.</p>
              )}
              <details className="mt-4">
                <summary className="t-meta cursor-pointer hover:text-ink">Edit title and description</summary>
                <ActionForm action={updateTaskAction} className="mt-3 flex flex-col gap-3">
                  <input type="hidden" name="ref" value={task.ref} />
                  <div>
                    <FieldLabel htmlFor="edit-title">Title</FieldLabel>
                    <Input id="edit-title" name="title" defaultValue={task.title} required />
                  </div>
                  <div>
                    <FieldLabel htmlFor="edit-body">Description (Markdown)</FieldLabel>
                    <Textarea id="edit-body" name="body" defaultValue={task.body} rows={12} />
                  </div>
                  <div>
                    <Submit>Save</Submit>
                  </div>
                </ActionForm>
              </details>
            </div>
          </Card>

          <Card title="Activity" count={events.length}>
            <div className="py-4">
              <Timeline events={events} />
              <ActionForm action={commentAction} resetOnSuccess className="mt-2 flex flex-col gap-2">
                <input type="hidden" name="ref" value={task.ref} />
                <label className="sr-only" htmlFor="comment-body">
                  Comment
                </label>
                <Textarea id="comment-body" name="body" placeholder="Comment (Markdown)" rows={3} required />
                <div>
                  <Submit variant="secondary">Comment</Submit>
                </div>
              </ActionForm>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Details">
            <ActionForm action={updateTaskAction} className="grid grid-cols-1 gap-3 py-4">
              <input type="hidden" name="ref" value={task.ref} />
              <div>
                <FieldLabel htmlFor="f-status">Status</FieldLabel>
                <Select id="f-status" name="status" defaultValue={task.status}>
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="f-space">Space</FieldLabel>
                <Select id="f-space" name="space" defaultValue={task.space ?? ""}>
                  <option value="">None (inbox)</option>
                  {SPACES.map((s) => (
                    <option key={s} value={s}>
                      {SPACE_LABEL[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="f-priority">Priority</FieldLabel>
                <Select id="f-priority" name="priority" defaultValue={task.priority}>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="f-assignee">Assignee</FieldLabel>
                <Select id="f-assignee" name="assignee" defaultValue={task.assignee ?? ""}>
                  <option value="">Unassigned</option>
                  {assignees.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="f-due">Due</FieldLabel>
                <Input id="f-due" name="due" type="date" defaultValue={task.due ?? ""} />
              </div>
              <div>
                <Submit>Save details</Submit>
              </div>
            </ActionForm>
          </Card>

          {task.lease && (
            <Card title="Claimed">
              <div className="py-4">
                <p className="t-row">{task.lease.holder}</p>
                <p className="t-meta">until {formatWhen(task.lease.expiresAt)}</p>
                {isOwner && (
                  <ActionForm action={releaseAction} className="mt-3">
                    <input type="hidden" name="ref" value={task.ref} />
                    <Submit variant="secondary" size="sm">
                      Release claim
                    </Submit>
                  </ActionForm>
                )}
              </div>
            </Card>
          )}

          {approvals.length > 0 && (
            <Card title="Approvals" count={approvals.length}>
              <ul className="flex flex-col gap-4 py-4">
                {approvals.map((a) => (
                  <li key={a.id}>
                    <p className="t-row">{a.action}</p>
                    <p className="t-meta">
                      {a.state}
                      {a.decidedAt && ` · ${formatWhen(a.decidedAt)}`}
                      {a.decisionNote && ` · ${a.decisionNote}`}
                    </p>
                    {a.state === "pending" && isOwner && (
                      <ActionForm action={decideApprovalAction} className="mt-2 flex flex-col gap-2">
                        <input type="hidden" name="id" value={a.id} />
                        <label className="sr-only" htmlFor={`note-${a.id}`}>
                          Note
                        </label>
                        <Input id={`note-${a.id}`} name="note" placeholder="Note (optional)" />
                        <div className="flex gap-2">
                          <Submit name="decision" value="approve" size="sm">
                            Approve
                          </Submit>
                          <Submit name="decision" value="reject" variant="danger" size="sm">
                            Reject
                          </Submit>
                        </div>
                      </ActionForm>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {!closed && (
            <Card title="Finish">
              <ActionForm action={completeAction} className="flex flex-col gap-2 py-4">
                <input type="hidden" name="ref" value={task.ref} />
                <label className="sr-only" htmlFor="summary">
                  Summary
                </label>
                <Textarea id="summary" name="summary" placeholder="What was done (optional)" rows={3} />
                <div>
                  <Submit variant="secondary">Mark done</Submit>
                </div>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
