import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "@/lib/db/client";
import { identities, type Identity } from "@/lib/db/schema";
import { exportToOlympus } from "./olympus-export";
import { importFromOlympus } from "./olympus-import";
import { createTask, listTasks, logProgress, type Ctx } from "./service";

let tmp: string;
let db: Db;
let owner: Identity;
const ctx = (): Ctx => ({ db, actor: owner });

const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd, encoding: "utf-8" });

function write(file: string, content: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bacon-olympus-"));
  db = openDb(":memory:");
  owner = db.insert(identities).values({ name: "gabriel", kind: "owner" }).returning().get();
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("importFromOlympus", () => {
  it("maps prose statuses, reads captures by domain, and skips on rerun", () => {
    write(path.join(tmp, "tasks/0001-a.md"), "# Task 0001: A\n\n## Status\n\nDone. Verified on Theseus.\n");
    write(path.join(tmp, "tasks/0002-b.md"), "# Task 0002: B\n\n## Status\n\nIn progress\n");
    write(path.join(tmp, "tasks/0003-c.md"), "# Task 0003: C\n\n## Status\n\nStage 1 done, stage 2 open.\n");
    write(
      path.join(tmp, "captures/aws/2-rotate-key.md"),
      "---\nid: 2\ndomain: aws\nstatus: open\ncreated_at: 2026-08-25T00:04:56.744Z\n---\n\n# rotate the root key\n",
    );

    expect(importFromOlympus(ctx(), tmp)).toEqual({
      imported: ["BCN-1", "BCN-2", "BCN-3", "BCN-4"],
      skipped: 0,
    });
    const byTitle = Object.fromEntries(
      listTasks(ctx(), { status: ["open", "in-progress", "done"] }).map((t) => [t.title, t]),
    );
    expect(byTitle["Task 0001: A"].status).toBe("done");
    expect(byTitle["Task 0002: B"].status).toBe("in-progress");
    expect(byTitle["Task 0003: C"].status).toBe("open");
    expect(byTitle["rotate the root key"].space).toBe("aws");

    expect(importFromOlympus(ctx(), tmp)).toEqual({ imported: [], skipped: 4 });
  });
});

describe("exportToOlympus", () => {
  it("commits a snapshot only when tasks changed", async () => {
    const repo = path.join(tmp, "olympus");
    fs.mkdirSync(repo);
    git(repo, "init", "--quiet");
    git(repo, "commit", "--quiet", "--allow-empty", "-m", "init");

    const task = createTask(ctx(), { title: "Ship bacon", space: "projects", body: "The MVP." }, "web");
    const first = await exportToOlympus(db, repo, { baseUrl: "https://bacon.test", push: false });
    expect(first.committed).toBe(true);

    const file = fs.readFileSync(path.join(repo, "tasks/bacon/BCN-1.md"), "utf-8");
    expect(file).toContain('status: "open"');
    expect(file).toContain("# BCN-1: Ship bacon");
    expect(file).toContain("https://bacon.test/t/BCN-1");
    expect(fs.readFileSync(path.join(repo, "tasks/bacon/README.md"), "utf-8")).toContain("[BCN-1](./BCN-1.md)");

    expect(await exportToOlympus(db, repo, { baseUrl: "https://bacon.test", push: false })).toEqual({
      committed: false,
    });

    logProgress(ctx(), { ref: task.id, body: "Halfway" });
    expect((await exportToOlympus(db, repo, { baseUrl: "https://bacon.test", push: false })).committed).toBe(true);
    expect(git(repo, "log", "--oneline").trim().split("\n")).toHaveLength(3);
  });
});
