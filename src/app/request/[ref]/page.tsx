import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { commentAction } from "@/app/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Timeline } from "@/components/Timeline";
import { Card, StatusBadge, Textarea } from "@/design/ui";
import { taskRef } from "@/lib/bacon/inputs";
import { BaconError, getTask, type TaskDetail } from "@/lib/bacon/service";
import { anyCtx } from "@/lib/bacon/session";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ ref: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await params).ref.toUpperCase() };
}

export default async function RequestDetailPage({ params }: Props) {
  const ctx = await anyCtx();
  const parsed = taskRef.safeParse((await params).ref);
  if (!parsed.success) notFound();

  let detail: TaskDetail;
  try {
    detail = getTask(ctx, parsed.data, 200);
  } catch (err) {
    if (err instanceof BaconError && err.code === "not_found") notFound();
    throw err;
  }
  const { task, events } = detail;

  return (
    <main className="shell max-w-3xl py-10">
      <Link href="/request" className="t-meta hover:text-ink">
        ← Your requests
      </Link>
      <header className="mt-3 mb-8">
        <p className="ref">{task.ref}</p>
        <h1 className="t-display mt-1">{task.title}</h1>
        <div className="mt-3 flex items-center gap-2">
          <StatusBadge status={task.status} />
          {task.due && <span className="t-meta t-mono">needed by {task.due}</span>}
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {task.body.trim() && (
          <Card title="Details">
            <div className="prose py-4">
              <ReactMarkdown>{task.body}</ReactMarkdown>
            </div>
          </Card>
        )}
        <Card title="Conversation">
          <div className="py-4">
            <Timeline events={events} />
            <ActionForm action={commentAction} resetOnSuccess className="mt-2 flex flex-col gap-2">
              <input type="hidden" name="ref" value={task.ref} />
              <label className="sr-only" htmlFor="reply">
                Reply
              </label>
              <Textarea id="reply" name="body" placeholder="Add context or reply" rows={3} required />
              <div>
                <Submit variant="secondary">Send</Submit>
              </div>
            </ActionForm>
          </div>
        </Card>
      </div>
    </main>
  );
}
