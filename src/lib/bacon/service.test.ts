import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { openDb, type Db } from "@/lib/db/client";
import { identities, taskEvents, type Identity } from "@/lib/db/schema";
import { taskRef } from "./inputs";
import { identityFromBearer } from "./tokens";
import {
  BaconError,
  addComment,
  claimTask,
  completeTask,
  createIdentity,
  createRequest,
  createTask,
  decideApproval,
  getTask,
  identityForEmail,
  listTasks,
  logProgress,
  releaseTask,
  requestApproval,
  revokeIdentity,
  triageRequest,
  updateTask,
  type Ctx,
} from "./service";

let db: Db;
let owner: Identity;
let ithaca: Identity;
let theseus: Identity;
let ana: Identity;
let ben: Identity;

const T0 = new Date("2026-10-12T12:00:00.000Z");
const at = (minutes: number) => () => new Date(T0.getTime() + minutes * 60_000);
const as = (actor: Identity, minutes = 0): Ctx => ({ db, actor, now: at(minutes) });

function add(name: string, kind: Identity["kind"]): Identity {
  return db.insert(identities).values({ name, kind }).returning().get();
}

function expectError(fn: () => unknown, code: BaconError["code"], message?: RegExp) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(BaconError);
    expect((err as BaconError).code).toBe(code);
    if (message) expect((err as BaconError).message).toMatch(message);
    return;
  }
  throw new Error(`expected a ${code} error`);
}

beforeEach(() => {
  db = openDb(":memory:");
  owner = add("gabriel", "owner");
  ithaca = add("ithaca", "agent");
  theseus = add("theseus", "agent");
  ana = add("ana", "requester");
  ben = add("ben", "requester");
});

describe("leases", () => {
  it("lets exactly one of two agents claim a task", () => {
    const task = createTask(as(owner), { title: "Wire MCP", space: "projects" }, "web");

    const claimed = claimTask(as(ithaca), { ref: task.id });
    expect(claimed.lease?.holder).toBe("ithaca");
    expect(claimed.status).toBe("in-progress");
    expect(claimed.assignee).toBe("ithaca");

    expectError(() => claimTask(as(theseus, 1), { ref: task.id }), "conflict", /claimed by ithaca/);
  });

  it("lets another agent take over once the lease expires", () => {
    const task = createTask(as(owner), { title: "Expiring", space: "projects" }, "web");
    claimTask(as(ithaca), { ref: task.id, minutes: 30 });

    expectError(() => claimTask(as(theseus, 29), { ref: task.id }), "conflict");
    const taken = claimTask(as(theseus, 31), { ref: task.id });
    expect(taken.lease?.holder).toBe("theseus");
  });

  it("renews for the holder without a conflict", () => {
    const task = createTask(as(owner), { title: "Renew", space: "projects" }, "web");
    claimTask(as(ithaca), { ref: task.id, minutes: 30 });
    const renewed = claimTask(as(ithaca, 20), { ref: task.id, minutes: 30 });
    expect(renewed.lease?.expiresAt).toBe(at(50)().toISOString());
    const claims = getTask(as(owner), task.id).events.filter((e) => e.type === "claim");
    expect(claims.map((e) => e.data?.renewed)).toEqual([false, true]);
  });

  it("refuses to claim inbox or closed tasks", () => {
    const inbox = createTask(as(owner), { title: "Untriaged" }, "web");
    expectError(() => claimTask(as(ithaca), { ref: inbox.id }), "conflict", /inbox/);

    const done = createTask(as(owner), { title: "Done", space: "work", status: "done" }, "web");
    expectError(() => claimTask(as(ithaca), { ref: done.id }), "conflict", /done/);
  });

  it("blocks other agents from editing a claimed task but not the owner", () => {
    const task = createTask(as(owner), { title: "Mine", space: "projects" }, "web");
    claimTask(as(ithaca), { ref: task.id });

    expectError(() => updateTask(as(theseus), { ref: task.id, priority: "high" }), "conflict");
    expectError(() => completeTask(as(theseus), { ref: task.id }), "conflict");
    expect(updateTask(as(owner), { ref: task.id, priority: "high" }).priority).toBe("high");
  });

  it("returns a released task to open and clears the lease", () => {
    const task = createTask(as(owner), { title: "Release", space: "projects" }, "web");
    claimTask(as(ithaca), { ref: task.id });
    expectError(() => releaseTask(as(theseus), { ref: task.id }), "conflict");
    const released = releaseTask(as(ithaca), { ref: task.id, note: "blocked on API key" });
    expect(released.status).toBe("open");
    expect(released.lease).toBeNull();
  });

  it("closes the lease when the task is completed", () => {
    const task = createTask(as(owner), { title: "Finish", space: "projects" }, "web");
    claimTask(as(ithaca), { ref: task.id });
    const done = completeTask(as(ithaca), { ref: task.id, summary: "shipped" });
    expect(done.status).toBe("done");
    expect(done.closedAt).not.toBeNull();
    expect(done.lease).toBeNull();
  });
});

describe("requesters", () => {
  it("can file a request into the inbox but not create or edit tasks", () => {
    const req = createRequest(as(ana), { title: "Review my abstract" }, "web");
    expect(req.status).toBe("inbox");
    expect(req.space).toBeNull();

    expectError(() => createTask(as(ana), { title: "x", space: "work" }, "web"), "forbidden");
    expectError(() => updateTask(as(ana), { ref: req.id, title: "y" }), "forbidden");
    expectError(() => claimTask(as(ana), { ref: req.id }), "forbidden");
  });

  it("cannot read or comment on someone else's request, and gets not_found", () => {
    const anas = createRequest(as(ana), { title: "Ana's" }, "web");
    expectError(() => getTask(as(ben), anas.id), "not_found");
    expectError(() => addComment(as(ben), { ref: anas.id, body: "hi" }), "not_found");
    expect(listTasks(as(ben))).toEqual([]);
  });

  it("only lists their own requests, even when filtering by someone else", () => {
    createRequest(as(ana), { title: "Ana's" }, "web");
    createRequest(as(ben), { title: "Ben's" }, "web");
    createTask(as(owner), { title: "Internal", space: "work" }, "web");
    const seen = listTasks(as(ana), { createdBy: "ben" }).map((t) => t.title);
    expect(seen).toEqual(["Ana's"]);
  });

  it("sees triage and comments on their request but not agent working notes", () => {
    const req = createRequest(as(ana), { title: "Help" }, "web");
    triageRequest(as(ithaca), { ref: req.id, accept: true, space: "projects", note: "on it" });
    logProgress(as(ithaca), { ref: req.id, body: "internal: reading the repo" });
    addComment(as(ithaca), { ref: req.id, body: "should be done Friday" });

    const types = getTask(as(ana), req.id).events.map((e) => e.type);
    expect(types).toEqual(["created", "triage", "comment"]);
    expect(getTask(as(ana), req.id).approvals).toEqual([]);
  });
});

describe("triage", () => {
  it("needs a space to accept and a note to reject", () => {
    const req = createRequest(as(ana), { title: "Thing" }, "web");
    expectError(() => triageRequest(as(ithaca), { ref: req.id, accept: true }), "invalid");
    expectError(() => triageRequest(as(ithaca), { ref: req.id, accept: false }), "invalid");

    const accepted = triageRequest(as(ithaca), { ref: req.id, accept: true, space: "work" });
    expect(accepted.status).toBe("open");
    expectError(() => triageRequest(as(ithaca), { ref: req.id, accept: true, space: "work" }), "conflict");
  });
});

describe("approvals", () => {
  it("only the owner decides, and only once", () => {
    const task = createTask(as(owner), { title: "Email venue", space: "student-community-day" }, "web");
    const approval = requestApproval(as(theseus), { ref: task.id, action: "send the drafted email" });

    expectError(() => decideApproval(as(theseus), { id: approval.id, approve: true }), "forbidden");
    expect(decideApproval(as(owner), { id: approval.id, approve: true }).state).toBe("approved");
    expectError(() => decideApproval(as(owner), { id: approval.id, approve: false }), "conflict");
  });
});

describe("events", () => {
  it("records one event per mutation", () => {
    const task = createTask(as(owner), { title: "Audit", space: "projects" }, "web");
    claimTask(as(ithaca), { ref: task.id });
    logProgress(as(ithaca), { ref: task.id, body: "half way" });
    updateTask(as(ithaca), { ref: task.id, priority: "high" });
    releaseTask(as(ithaca), { ref: task.id });
    completeTask(as(owner), { ref: task.id });

    const types = db
      .select({ type: taskEvents.type })
      .from(taskEvents)
      .where(eq(taskEvents.taskId, task.id))
      .all()
      .map((e) => e.type);
    expect(types).toEqual(["created", "claim", "progress", "update", "release", "status"]);
  });

  it("does not log an update that changed nothing", () => {
    const task = createTask(as(owner), { title: "Same", space: "projects" }, "web");
    updateTask(as(owner), { ref: task.id, title: "Same" });
    expect(getTask(as(owner), task.id).events).toHaveLength(1);
  });
});

describe("identities", () => {
  it("mints a token that resolves until revoked", () => {
    const { identity, token } = createIdentity(as(owner), { name: "odysseus", kind: "agent" });
    expect(token).toMatch(/^bcn_/);
    expect(identityFromBearer(db, `Bearer ${token}`)?.name).toBe("odysseus");
    expect(identityFromBearer(db, "Bearer bcn_wrong")).toBeNull();
    expect(identityFromBearer(db, token)).toBeNull();

    revokeIdentity(as(owner), identity.id);
    expect(identityFromBearer(db, `Bearer ${token}`)).toBeNull();
  });

  it("only lets the owner mint tokens", () => {
    expectError(() => createIdentity(as(ithaca), { name: "rogue", kind: "owner" }), "forbidden");
  });

  it("creates the configured owner on first Access sign-in only", () => {
    const fresh = openDb(":memory:");
    expect(identityForEmail(fresh, "stranger@example.com", "gabriel@example.com")).toBeNull();
    const created = identityForEmail(fresh, "Gabriel@Example.com", "gabriel@example.com");
    expect(created?.kind).toBe("owner");
    expect(identityForEmail(fresh, "gabriel@example.com", "gabriel@example.com")?.id).toBe(created?.id);
  });
});

describe("taskRef", () => {
  it("accepts BCN refs and bare numbers", () => {
    expect(taskRef.parse("BCN-42")).toBe(42);
    expect(taskRef.parse("bcn-7")).toBe(7);
    expect(taskRef.parse("12")).toBe(12);
    expect(taskRef.parse(3)).toBe(3);
    expect(taskRef.safeParse("TASK-1").success).toBe(false);
  });
});
