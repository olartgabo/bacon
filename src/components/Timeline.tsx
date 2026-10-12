import ReactMarkdown from "react-markdown";
import { TimelineItem, formatWhen } from "@/design/ui";
import { SPACE_LABEL, STATUS_LABEL, type Space, type TaskStatus } from "@/lib/bacon/model";
import type { EventView } from "@/lib/bacon/service";

type Changes = Record<string, [unknown, unknown]>;

function verb(e: EventView): React.ReactNode {
  const data = e.data ?? {};
  switch (e.type) {
    case "created":
      return "created this";
    case "comment":
      return "commented";
    case "progress":
      return "logged progress";
    case "status": {
      const [from, to] = (data.changes as Changes | undefined)?.status ?? [];
      return `moved this from ${STATUS_LABEL[from as TaskStatus] ?? from} to ${STATUS_LABEL[to as TaskStatus] ?? to}`;
    }
    case "update":
      return `updated ${Object.keys((data.changes as Changes | undefined) ?? {}).join(", ")}`;
    case "claim":
      return data.renewed
        ? `renewed the claim until ${formatWhen(String(data.expiresAt))}`
        : `claimed this until ${formatWhen(String(data.expiresAt))}`;
    case "release":
      return `released the claim (now ${STATUS_LABEL[data.status as TaskStatus] ?? data.status})`;
    case "link":
      return "added a link";
    case "triage":
      return data.accepted ? `accepted this into ${SPACE_LABEL[data.space as Space] ?? data.space}` : "declined this";
    case "approval":
      return data.state === "pending" ? "asked for approval" : `${data.state} the request`;
  }
}

/** Markdown is rendered without raw HTML, and react-markdown drops
 * javascript: URLs, so agent-written bodies cannot inject script. */
export function Timeline({ events }: { events: EventView[] }) {
  return (
    <ol className="timeline">
      {events.map((e) => (
        <TimelineItem key={e.id} actor={e.actor} kind={e.actorKind} verb={verb(e)} at={e.at}>
          {e.type === "link" && typeof e.data?.url === "string" && (
            <a href={e.data.url} target="_blank" rel="noreferrer noopener" className="t-row text-brand-ink underline">
              {e.body || e.data.url}
            </a>
          )}
          {e.type !== "link" && e.body && (
            <div className="prose">
              <ReactMarkdown>{e.body}</ReactMarkdown>
            </div>
          )}
        </TimelineItem>
      ))}
    </ol>
  );
}
