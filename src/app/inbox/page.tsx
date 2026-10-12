import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { triageAction } from "@/app/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Card, EmptyState, Input, Select, formatWhen } from "@/design/ui";
import { PRIORITIES, SPACES, SPACE_LABEL } from "@/lib/bacon/model";
import { getTask, listInbox } from "@/lib/bacon/service";
import { staffCtx } from "@/lib/bacon/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  const ctx = await staffCtx();
  const items = listInbox(ctx).map((t) => getTask(ctx, t.id, 1).task);

  return (
    <main className="shell py-10">
      <header className="mb-8">
        <h1 className="t-display">Inbox</h1>
        <p className="t-meta mt-2">
          Requests from requesters and tasks filed without a space. Accept into a space, or decline with a note the
          requester will read.
        </p>
      </header>

      {items.length === 0 ? (
        <Card>
          <EmptyState title="Inbox zero">New requests land here for triage.</EmptyState>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((t) => (
            <Card
              key={t.id}
              title={
                <Link href={`/t/${t.ref}`} className="hover:text-brand-ink">
                  <span className="ref mr-2">{t.ref}</span>
                  {t.title}
                </Link>
              }
            >
              <div className="py-4">
                <p className="t-meta">
                  from {t.createdBy} · {formatWhen(t.createdAt)}
                  {t.due && <span className="t-mono"> · wants it by {t.due}</span>}
                </p>
                {t.body.trim() && (
                  <div className="prose mt-3">
                    <ReactMarkdown>{t.body}</ReactMarkdown>
                  </div>
                )}
                <ActionForm action={triageAction} className="mt-4 flex flex-col gap-2">
                  <input type="hidden" name="ref" value={t.ref} />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="sr-only" htmlFor={`space-${t.id}`}>
                      Space
                    </label>
                    <Select id={`space-${t.id}`} name="space" defaultValue="" className="sm:w-56">
                      <option value="">Choose a space…</option>
                      {SPACES.map((s) => (
                        <option key={s} value={s}>
                          {SPACE_LABEL[s]}
                        </option>
                      ))}
                    </Select>
                    <label className="sr-only" htmlFor={`priority-${t.id}`}>
                      Priority
                    </label>
                    <Select id={`priority-${t.id}`} name="priority" defaultValue="normal" className="sm:w-32">
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Select>
                    <label className="sr-only" htmlFor={`note-${t.id}`}>
                      Note to requester
                    </label>
                    <Input id={`note-${t.id}`} name="note" placeholder="Note to the requester" />
                  </div>
                  <div className="flex gap-2">
                    <Submit name="decision" value="accept">
                      Accept
                    </Submit>
                    <Submit name="decision" value="reject" variant="ghost">
                      Decline
                    </Submit>
                  </div>
                </ActionForm>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
