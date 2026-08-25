#!/usr/bin/env node
/**
 * Renders unsynced captures from the dashboard API to Markdown in a local
 * olympus checkout, commits, pushes, then marks each capture synced with
 * its file path. Per olympus decision 0004: SQLite is a write buffer,
 * Markdown is canonical — this script is what makes that true.
 *
 * Run from a device with git write access to olympus (not the dashboard
 * host, which only holds a read-only deploy key). Requires:
 *   DASHBOARD_API_URL   e.g. http://localhost:3000 (or the deployed origin)
 *   OLYMPUS_REPO_PATH   local olympus checkout with git write access,
 *                        clean working tree, checked out on main
 * Against the deployed origin, also set CF_ACCESS_CLIENT_ID and
 * CF_ACCESS_CLIENT_SECRET (a Cloudflare Access service token) — see
 * tasks/0007-dashboard-task-capture.md in olympus.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const apiUrl = process.env.DASHBOARD_API_URL;
const repoPath = process.env.OLYMPUS_REPO_PATH;

if (!apiUrl || !repoPath) {
  console.error(
    "Set DASHBOARD_API_URL and OLYMPUS_REPO_PATH before running sync-captures.",
  );
  process.exit(1);
}

const accessHeaders = {};
if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
  accessHeaders["CF-Access-Client-Id"] = process.env.CF_ACCESS_CLIENT_ID;
  accessHeaders["CF-Access-Client-Secret"] = process.env.CF_ACCESS_CLIENT_SECRET;
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function captureMarkdown(capture) {
  return `---
id: ${capture.id}
domain: ${capture.domain}
status: ${capture.status}
source: ${capture.source}
created_at: ${capture.createdAt}
---

# ${capture.title}
`;
}

async function main() {
  const res = await fetch(`${apiUrl}/api/captures?synced=false`, {
    headers: accessHeaders,
  });
  if (!res.ok) {
    throw new Error(`fetching pending captures failed: ${res.status}`);
  }
  const { captures } = await res.json();

  if (captures.length === 0) {
    console.log("nothing to sync");
    return;
  }

  const git = (...args) =>
    execFileSync("git", args, { cwd: repoPath, encoding: "utf-8" });

  const branch = git("rev-parse", "--abbrev-ref", "HEAD").trim();
  if (branch !== "main") {
    throw new Error(
      `olympus checkout at ${repoPath} is on ${branch}, not main — refusing to sync`,
    );
  }

  const status = git("status", "--short");
  if (status.trim().length > 0) {
    throw new Error(
      `olympus checkout at ${repoPath} has uncommitted changes — refusing to sync into a dirty tree`,
    );
  }

  for (const capture of captures) {
    const relPath = path.join(
      "captures",
      capture.domain,
      `${capture.id}-${slugify(capture.title)}.md`,
    );
    const absPath = path.join(repoPath, relPath);
    mkdirSync(path.dirname(absPath), { recursive: true });
    writeFileSync(absPath, captureMarkdown(capture));
    git("add", relPath);
    console.log(`wrote ${relPath}`);
  }

  // A capture whose file is already on disk from a previous run stages no
  // diff. Committing anyway fails with "nothing to commit" and takes the
  // whole run down — which is how one failed PATCH below used to wedge every
  // future sync. Commit only when something actually changed, then fall
  // through and retry the PATCH.
  if (git("diff", "--cached", "--name-only").trim()) {
    git(
      "commit",
      "-m",
      `captures: sync ${captures.length} pending capture(s)`,
    );
    git("push", "origin", "main");
    console.log("pushed");
  } else {
    console.log("capture files already committed — retrying the synced mark");
  }

  for (const capture of captures) {
    const relPath = path
      .join("captures", capture.domain, `${capture.id}-${slugify(capture.title)}.md`)
      .replace(/\\/g, "/");
    const patchRes = await fetch(`${apiUrl}/api/captures/${capture.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...accessHeaders },
      body: JSON.stringify({ synced: true, markdownPath: relPath }),
    });
    if (!patchRes.ok) {
      console.error(
        `WARNING: capture ${capture.id} is in the repo but marking it synced failed (${patchRes.status}) — the next run will retry the mark. If it keeps failing, check the dashboard API.`,
      );
      continue;
    }
    console.log(`marked capture ${capture.id} synced`);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
