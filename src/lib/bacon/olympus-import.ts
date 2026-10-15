import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { eq } from "drizzle-orm";
import { taskEvents, tasks } from "@/lib/db/schema";
import { SPACES, type Space, type TaskStatus } from "./model";
import { BaconError, formatRef, type Ctx } from "./service";

type Found = { key: string; title: string; body: string; space: Space; status: TaskStatus; createdAt?: string };

/** olympus statuses are prose ("Done. Verified on Theseus…"), so only the
 * opening words are trusted. Anything partial stays open for a person to
 * look at. */
function statusFromProse(prose: string | null): TaskStatus {
  if (!prose) return "open";
  if (/^(done|deployed)\b/i.test(prose)) return "done";
  if (/^in progress\b/i.test(prose)) return "in-progress";
  return "open";
}

function readMarkdown(dir: string): { file: string; raw: string }[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  return entries.sort().map((file) => ({ file, raw: fs.readFileSync(path.join(dir, file), "utf-8") }));
}

function collect(repo: string): Found[] {
  const found: Found[] = [];

  for (const { file, raw } of readMarkdown(path.join(repo, "tasks"))) {
    const { content } = matter(raw);
    const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? file;
    const status = content.match(/^##\s+Status\s*\n+(.+)$/m)?.[1]?.trim() ?? null;
    found.push({ key: `olympus:tasks/${file}`, title, body: content, space: "projects", status: statusFromProse(status) });
  }

  for (const domain of SPACES) {
    for (const { file, raw } of readMarkdown(path.join(repo, "captures", domain))) {
      const { data, content } = matter(raw);
      const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? file;
      const status = data.status === "done" ? "done" : data.status === "in-progress" ? "in-progress" : "open";
      found.push({
        key: `olympus:captures/${domain}/${file}`,
        title,
        body: content.replace(/^#\s+.+\n?/m, "").trim(),
        space: domain,
        status,
        createdAt: typeof data.created_at === "string" ? data.created_at : undefined,
      });
    }
  }
  return found;
}

/**
 * One-time move of olympus tasks/ and captures/ into bacon. Safe to run
 * again: rows are keyed by their olympus path and skipped once imported.
 */
export function importFromOlympus(ctx: Ctx, repo: string): { imported: string[]; skipped: number } {
  if (ctx.actor.kind !== "owner") throw new BaconError("forbidden", "only the owner can import");
  if (!fs.existsSync(path.join(repo, "tasks"))) {
    throw new BaconError("invalid", `${repo} does not look like an olympus checkout`);
  }

  const at = new Date().toISOString();
  const imported: string[] = [];
  let skipped = 0;
  ctx.db.transaction((tx) => {
    for (const item of collect(repo)) {
      if (tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.externalKey, item.key)).get()) {
        skipped++;
        continue;
      }
      const created = item.createdAt ?? at;
      const row = tx
        .insert(tasks)
        .values({
          title: item.title,
          body: item.body,
          space: item.space,
          status: item.status,
          createdById: ctx.actor.id,
          source: "import",
          externalKey: item.key,
          createdAt: created,
          updatedAt: at,
          closedAt: item.status === "done" ? at : null,
        })
        .returning({ id: tasks.id })
        .get();
      tx.insert(taskEvents)
        .values({
          taskId: row.id,
          actorId: ctx.actor.id,
          type: "created",
          body: `Imported from ${item.key.replace(/^olympus:/, "olympus/")}`,
          createdAt: at,
        })
        .run();
      imported.push(formatRef(row.id));
    }
  });
  return { imported, skipped };
}
