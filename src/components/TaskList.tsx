import Link from "next/link";
import { EmptyState, PriorityBadge, StatusBadge } from "@/design/ui";
import { SPACE_LABEL } from "@/lib/bacon/model";
import type { TaskView } from "@/lib/bacon/service";

/** Normal priority and the space you're already filtered to are noise in
 * a row, so they only show when they say something. */
export function TaskList({
  tasks,
  empty,
  hideSpace = false,
  hrefBase = "/t",
}: {
  tasks: TaskView[];
  empty: string;
  hideSpace?: boolean;
  hrefBase?: string;
}) {
  if (tasks.length === 0) return <EmptyState title={empty} />;
  return (
    <div className="py-1">
      {tasks.map((t) => (
        <Link key={t.id} href={`${hrefBase}/${t.ref}`} className="task-row">
          <span className="ref shrink-0 sm:w-14">{t.ref}</span>
          <span className="min-w-0 flex-1">
            <span className="t-row line-clamp-2 sm:line-clamp-1">{t.title}</span>
            <span className="t-meta flex flex-wrap gap-x-3">
              {!hideSpace && t.space && <span>{SPACE_LABEL[t.space]}</span>}
              {t.assignee && <span>{t.assignee}</span>}
              {t.due && <span className="t-mono">due {t.due}</span>}
              {t.lease && <span>claimed by {t.lease.holder}</span>}
            </span>
          </span>
          {t.priority !== "normal" && <PriorityBadge priority={t.priority} />}
          <StatusBadge status={t.status} />
        </Link>
      ))}
    </div>
  );
}
