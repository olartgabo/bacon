import type { Metadata } from "next";
import Link from "next/link";
import { decideApprovalAction } from "@/app/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Card, EmptyState, Input, Tabs, formatWhen } from "@/design/ui";
import { APPROVAL_STATES, type ApprovalState } from "@/lib/bacon/model";
import { listApprovals } from "@/lib/bacon/service";
import { staffCtx } from "@/lib/bacon/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const ctx = await staffCtx();
  const requested = (await searchParams).state;
  const state: ApprovalState = APPROVAL_STATES.includes(requested as ApprovalState)
    ? (requested as ApprovalState)
    : "pending";
  const approvals = listApprovals(ctx, state);
  const isOwner = ctx.actor.kind === "owner";

  return (
    <main className="shell py-10">
      <header className="mb-6">
        <h1 className="t-display">Approvals</h1>
        <p className="t-meta mt-2">Agents ask here before they send, publish, spend, or touch production.</p>
      </header>

      <div className="mb-4">
        <Tabs
          label="State"
          current={state === "pending" ? "/approvals" : `/approvals?state=${state}`}
          items={APPROVAL_STATES.map((s) => ({
            href: s === "pending" ? "/approvals" : `/approvals?state=${s}`,
            label: s[0].toUpperCase() + s.slice(1),
          }))}
        />
      </div>

      {approvals.length === 0 ? (
        <Card>
          <EmptyState title={`No ${state} approvals`} />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {approvals.map((a) => (
            <Card key={a.id}>
              <div className="py-4">
                <p className="t-meta">
                  <Link href={`/t/${a.ref}`} className="ref hover:text-brand-ink">
                    {a.ref}
                  </Link>{" "}
                  {a.taskTitle}
                </p>
                <p className="t-row mt-1">{a.action}</p>
                <p className="t-meta mt-1">
                  {a.requestedBy} asked {formatWhen(a.createdAt)}
                  {a.decidedAt && ` · decided ${formatWhen(a.decidedAt)}`}
                  {a.decisionNote && ` · “${a.decisionNote}”`}
                </p>
                {a.payload && (
                  <pre className="t-mono mt-3 overflow-x-auto rounded-sm bg-well p-3">
                    {JSON.stringify(a.payload, null, 2)}
                  </pre>
                )}
                {a.state === "pending" && isOwner && (
                  <ActionForm action={decideApprovalAction} className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input type="hidden" name="id" value={a.id} />
                    <label className="sr-only" htmlFor={`note-${a.id}`}>
                      Note
                    </label>
                    <Input id={`note-${a.id}`} name="note" placeholder="Note (optional)" />
                    <div className="flex gap-2">
                      <Submit name="decision" value="approve">
                        Approve
                      </Submit>
                      <Submit name="decision" value="reject" variant="danger">
                        Reject
                      </Submit>
                    </div>
                  </ActionForm>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
