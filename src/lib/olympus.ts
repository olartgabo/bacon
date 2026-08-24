import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/**
 * Stage 1 is read-only: no database, no writes. Every function here just
 * parses Markdown out of a checkout of olartgabo/olympus, per
 * docs/web-dashboard-stack.md's build order. OLYMPUS_REPO_PATH is a local
 * checkout in dev; on the host it's a path a scheduled `git pull` keeps
 * current (build order stage 2+ — not implemented here).
 */

function repoPath(...segments: string[]): string {
  const root = process.env.OLYMPUS_REPO_PATH;
  if (!root) {
    throw new Error(
      "OLYMPUS_REPO_PATH is not set — point it at a local olympus checkout (see .env.example).",
    );
  }
  return path.join(root, ...segments);
}

function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

export type ActionItem = {
  raw: string;
  done: boolean;
  text: string;
};

/** Splits human/actions.md into its Pending and Done sections. */
export function getActions(): { pending: ActionItem[]; done: ActionItem[] } {
  const content = readFileSafe(repoPath("human", "actions.md")) ?? "";
  const sections: Record<string, string[]> = { Pending: [], Done: [] };
  let current: "Pending" | "Done" | null = null;

  for (const line of content.split("\n")) {
    if (line.startsWith("## Pending")) {
      current = "Pending";
      continue;
    }
    if (line.startsWith("## Done")) {
      current = "Done";
      continue;
    }
    if (line.startsWith("## ")) {
      current = null;
      continue;
    }
    if (current && /^- \[[ xX]\]/.test(line)) {
      sections[current].push(line);
    }
  }

  const parseItems = (lines: string[]): ActionItem[] =>
    lines.map((raw) => ({
      raw,
      done: /^- \[[xX]\]/.test(raw),
      text: raw.replace(/^- \[[ xX]\]\s*/, ""),
    }));

  return {
    pending: parseItems(sections.Pending),
    done: parseItems(sections.Done),
  };
}

export type RepoDoc = {
  slug: string;
  title: string;
  status: string | null;
  body: string;
};

/** Reads every .md file in tasks/ or decisions/, newest-numbered first. */
export function getNumberedDocs(kind: "tasks" | "decisions"): RepoDoc[] {
  const dir = repoPath(kind);
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();
  } catch {
    return [];
  }

  return files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    const { content } = matter(raw);
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const statusMatch = content.match(/^##\s+Status\s*\n+(.+)$/m);
    return {
      slug: file.replace(/\.md$/, ""),
      title: titleMatch?.[1] ?? file,
      status: statusMatch?.[1]?.trim() ?? null,
      body: content,
    };
  });
}

export type LogEntry = {
  device: string;
  date: string;
  body: string;
};

/** Most recent N log entries across all devices, newest first. */
export function getRecentLogs(limit = 10): LogEntry[] {
  const logsRoot = repoPath("logs");
  let devices: string[] = [];
  try {
    devices = fs
      .readdirSync(logsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }

  const entries: LogEntry[] = [];
  for (const device of devices) {
    const deviceDir = path.join(logsRoot, device);
    let files: string[] = [];
    try {
      files = fs.readdirSync(deviceDir).filter((f) => f.endsWith(".md"));
    } catch {
      continue;
    }
    for (const file of files) {
      const date = file.replace(/\.md$/, "");
      const body = fs.readFileSync(path.join(deviceDir, file), "utf-8");
      entries.push({ device, date, body });
    }
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}
