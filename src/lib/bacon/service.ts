import { and, asc, desc, eq, inArray, isNull, lte, notInArray, or, sql, type SQL } from "drizzle-orm";
import type { z } from "zod";
import type { Db } from "@/lib/db/client";
import {
  approvals,
  identities,
  taskEvents,
  tasks,
  type Approval,
  type Identity,
  type Task,
} from "@/lib/db/schema";
import { mintToken } from "./tokens";
import {
  CLOSED_STATUSES,
  TASK_STATUSES,
  type EventType,
  type IdentityKind,
  type Source,
  type TaskStatus,
} from "./model";
import type {
  claimInput,
  completeInput,
  CreateTaskInput,
  createRequestInput,
  decideApprovalInput,
  linkInput,
  ListTasksInput,
  noteInput,
  releaseInput,
  requestApprovalInput,
  triageInput,
  UpdateTaskInput,
} from "./inputs";

export type ErrorCode = "not_found" | "forbidden" | "conflict" | "invalid";

/** The only error type the service throws on purpose. Callers map `code`
 * to an HTTP status or an MCP tool error; anything else is a bug. */
export class BaconError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export type Ctx = {
  db: Db;
  actor: Identity;
  /** Injected by tests to move the clock past a lease expiry. */
  now?: () => Date;
};

export const DEFAULT_LEASE_MINUTES = 30;

export const formatRef = (id: number) => `BCN-${id}`;

const OPEN_STATUSES = TASK_STATUSES.filter((s) => !CLOSED_STATUSES.includes(s));
const isClosed = (s: TaskStatus) => CLOSED_STATUSES.includes(s);

/** Requesters see the conversation on their request, not the agents'
 * working notes, links, or lease churn. */
const REQUESTER_EVENT_TYPES: EventType[] = ["created", "status", "triage", "comment"];

const stamp = (ctx: Ctx) => (ctx.now?.() ?? new Date()).toISOString();

// ---- Views --------------------------------------------------------------

export type TaskView = {
  ref: string;
  id: number;
  title: string;
  space: Task["space"];
  status: TaskStatus;
  priority: Task["priority"];
  due: string | null;
  assignee: string | null;
  createdBy: string;
  source: Source;
  /** Present only while a lease is live. */
  lease: { holder: string; expiresAt: string } | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type EventView = {
  id: number;
  type: EventType;
  actor: string;
  actorKind: IdentityKind;
  body: string | null;
  data: Record<string, unknown> | null;
  at: string;
};

type Names = Map<number, Identity>;

// Identities are a handful of rows (one owner, a few agents and
// requesters), so resolving names from one full read is simpler than a
// join per foreign key.
function names(ctx: Ctx): Names {
  return new Map(
    ctx.db
      .select()
      .from(identities)
      .all()
      .map((i) => [i.id, i]),
  );
}

function view(task: Task, who: Names, nowIso: string): TaskView {
  const name = (id: number | null) => (id === null ? null : (who.get(id)?.name ?? `#${id}`));
  const live = task.leaseHolderId !== null && task.leaseExpiresAt !== null && task.leaseExpiresAt > nowIso;
  return {
    ref: formatRef(task.id),
    id: task.id,
    title: task.title,
    space: task.space,
    status: task.status,
    priority: task.priority,
    due: task.due,
    assignee: name(task.assigneeId),
    createdBy: name(task.createdById) ?? "",
    source: task.source,
    lease: live ? { holder: name(task.leaseHolderId) ?? "", expiresAt: task.leaseExpiresAt! } : null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    closedAt: task.closedAt,
  };
}

// ---- Guards -------------------------------------------------------------

const isStaff = (actor: Identity) => actor.kind !== "requester";

function requireStaff(ctx: Ctx) {
  if (!isStaff(ctx.actor)) throw new BaconError("forbidden", "requesters can only file and follow their own requests");
}

function requireOwner(ctx: Ctx) {
  if (ctx.actor.kind !== "owner") throw new BaconError("forbidden", "only the owner can do this");
}

/** A requester asking about someone else's task gets the same answer as
 * for a task that does not exist, so refs can't be probed. */
function loadTask(ctx: Ctx, id: number): Task {
  const task = ctx.db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task || (!isStaff(ctx.actor) && task.createdById !== ctx.actor.id)) {
    throw new BaconError("not_found", `${formatRef(id)} not found`);
  }
  return task;
}

function foreignLease(ctx: Ctx, task: Task, nowIso: string): boolean {
  return (
    task.leaseHolderId !== null &&
    task.leaseHolderId !== ctx.actor.id &&
    task.leaseExpiresAt !== null &&
    task.leaseExpiresAt > nowIso
  );
}

function leaseConflict(ctx: Ctx, task: Task): BaconError {
  const holder = names(ctx).get(task.leaseHolderId!)?.name ?? "another agent";
  return new BaconError("conflict", `${formatRef(task.id)} is claimed by ${holder} until ${task.leaseExpiresAt}`);
}

/** Agents respect each other's leases; the owner can always step in. */
function requireNoForeignLease(ctx: Ctx, task: Task, nowIso: string) {
  if (ctx.actor.kind !== "owner" && foreignLease(ctx, task, nowIso)) throw leaseConflict(ctx, task);
}

function resolveWho(ctx: Ctx, who: string | null | undefined): number | null | undefined {
  if (who === undefined || who === null) return who;
  if (who.toLowerCase() === "me") return ctx.actor.id;
  const found = ctx.db
    .select()
    .from(identities)
    .where(and(sql`lower(${identities.name}) = lower(${who})`, isNull(identities.revokedAt)))
    .get();
  if (!found) throw new BaconError("invalid", `no identity named "${who}"`);
  return found.id;
}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

function logEvent(
  tx: Tx | Db,
  taskId: number,
  actorId: number,
  type: EventType,
  at: string,
  body?: string | null,
  data?: Record<string, unknown>,
) {
  tx.insert(taskEvents)
    .values({ taskId, actorId, type, body: body ?? null, data: data ?? null, createdAt: at })
    .run();
}

// ---- Tasks --------------------------------------------------------------

export function whoami(ctx: Ctx) {
  return { name: ctx.actor.name, kind: ctx.actor.kind };
}

export function createTask(ctx: Ctx, input: CreateTaskInput, source: Source): TaskView {
  requireStaff(ctx);
  const status = input.status ?? (input.space ? "open" : "inbox");
  if (status !== "inbox" && !input.space) {
    throw new BaconError("invalid", "space is required unless the task goes to the inbox");
  }
  const at = stamp(ctx);
  const task = ctx.db.transaction((tx) => {
    const row = tx
      .insert(tasks)
      .values({
        title: input.title,
        body: input.body ?? "",
        space: input.space ?? null,
        status,
        priority: input.priority ?? "normal",
        due: input.due ?? null,
        assigneeId: resolveWho(ctx, input.assignee) ?? null,
        createdById: ctx.actor.id,
        source,
        createdAt: at,
        updatedAt: at,
        closedAt: isClosed(status) ? at : null,
      })
      .returning()
      .get();
    logEvent(tx, row.id, ctx.actor.id, "created", at);
    return row;
  });
  return view(task, names(ctx), at);
}

/** Anyone can file a request. It lands in the inbox with no space, and
 * the requester can follow only the requests they filed. */
export function createRequest(
  ctx: Ctx,
  input: z.infer<typeof createRequestInput>,
  source: Source,
): TaskView {
  const at = stamp(ctx);
  const task = ctx.db.transaction((tx) => {
    const row = tx
      .insert(tasks)
      .values({
        title: input.title,
        body: input.body ?? "",
        status: "inbox",
        due: input.due ?? null,
        createdById: ctx.actor.id,
        source,
        createdAt: at,
        updatedAt: at,
      })
      .returning()
      .get();
    logEvent(tx, row.id, ctx.actor.id, "created", at);
    return row;
  });
  return view(task, names(ctx), at);
}

const PRIORITY_RANK = sql`case ${tasks.priority} when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end`;

export function listTasks(ctx: Ctx, input: ListTasksInput = {}): TaskView[] {
  const where: SQL[] = [inArray(tasks.status, input.status ?? OPEN_STATUSES)];
  if (!isStaff(ctx.actor)) {
    where.push(eq(tasks.createdById, ctx.actor.id));
  } else {
    const assignee = resolveWho(ctx, input.assignee);
    if (assignee) where.push(eq(tasks.assigneeId, assignee));
    const creator = resolveWho(ctx, input.createdBy);
    if (creator) where.push(eq(tasks.createdById, creator));
  }
  if (input.space) where.push(eq(tasks.space, input.space));
  if (input.dueBefore) where.push(lte(tasks.due, input.dueBefore));
  if (input.q) {
    where.push(sql`instr(lower(${tasks.title} || ' ' || ${tasks.body}), lower(${input.q})) > 0`);
  }

  const rows = ctx.db
    .select()
    .from(tasks)
    .where(and(...where))
    .orderBy(PRIORITY_RANK, sql`${tasks.due} is null`, asc(tasks.due), desc(tasks.id))
    .limit(input.limit ?? 50)
    .all();
  const who = names(ctx);
  const at = stamp(ctx);
  return rows.map((t) => view(t, who, at));
}

export type TaskDetail = {
  task: TaskView & { body: string };
  events: EventView[];
  approvals: Approval[];
};

export function getTask(ctx: Ctx, id: number, eventLimit = 50): TaskDetail {
  const task = loadTask(ctx, id);
  const staff = isStaff(ctx.actor);
  const eventWhere = staff
    ? eq(taskEvents.taskId, id)
    : and(eq(taskEvents.taskId, id), inArray(taskEvents.type, REQUESTER_EVENT_TYPES));
  // Newest N, returned oldest-first so a timeline reads top to bottom.
  const events = ctx.db
    .select()
    .from(taskEvents)
    .where(eventWhere)
    .orderBy(desc(taskEvents.id))
    .limit(eventLimit)
    .all()
    .reverse();
  const who = names(ctx);
  const at = stamp(ctx);
  return {
    task: { ...view(task, who, at), body: task.body },
    events: events.map((e) => {
      const actor = who.get(e.actorId);
      return {
        id: e.id,
        type: e.type,
        actor: actor?.name ?? `#${e.actorId}`,
        actorKind: actor?.kind ?? "agent",
        body: e.body,
        data: e.data,
        at: e.createdAt,
      };
    }),
    approvals: staff
      ? ctx.db.select().from(approvals).where(eq(approvals.taskId, id)).orderBy(asc(approvals.id)).all()
      : [],
  };
}

export function updateTask(ctx: Ctx, input: UpdateTaskInput): TaskView {
  requireStaff(ctx);
  const at = stamp(ctx);
  const task = loadTask(ctx, input.ref);
  requireNoForeignLease(ctx, task, at);

  const next = {
    title: input.title,
    body: input.body,
    space: input.space,
    status: input.status,
    priority: input.priority,
    due: input.due,
    assigneeId: resolveWho(ctx, input.assignee),
  };
  const changes: Record<string, [unknown, unknown]> = {};
  const patch: Partial<Task> = {};
  for (const [key, value] of Object.entries(next) as [keyof typeof next, unknown][]) {
    if (value !== undefined && value !== task[key]) {
      changes[key] = [task[key], value];
      Object.assign(patch, { [key]: value });
    }
  }
  if (Object.keys(changes).length === 0) return view(task, names(ctx), at);

  const status = patch.status ?? task.status;
  const space = patch.space !== undefined ? patch.space : task.space;
  if (status !== "inbox" && !space) {
    throw new BaconError("invalid", "set a space before moving the task out of the inbox");
  }
  if (patch.status) {
    patch.closedAt = isClosed(patch.status) ? at : null;
    if (isClosed(patch.status)) {
      patch.leaseHolderId = null;
      patch.leaseExpiresAt = null;
    }
  }
  patch.updatedAt = at;

  // The body diff would bloat every timeline entry, so it is recorded as
  // "changed" rather than as before/after text.
  if (changes.body) changes.body = ["…", "…"];

  const updated = ctx.db.transaction((tx) => {
    const row = tx.update(tasks).set(patch).where(eq(tasks.id, task.id)).returning().get();
    logEvent(tx, task.id, ctx.actor.id, changes.status ? "status" : "update", at, null, { changes });
    return row;
  });
  return view(updated, names(ctx), at);
}

/**
 * Takes or renews the lease in a single conditional UPDATE: it only
 * matches when nobody holds a live lease or the caller already holds it,
 * so two agents racing for the same task cannot both win.
 */
export function claimTask(ctx: Ctx, input: z.infer<typeof claimInput>): TaskView {
  requireStaff(ctx);
  const nowDate = ctx.now?.() ?? new Date();
  const at = nowDate.toISOString();
  const minutes = input.minutes ?? DEFAULT_LEASE_MINUTES;
  const expiresAt = new Date(nowDate.getTime() + minutes * 60_000).toISOString();
  const before = loadTask(ctx, input.ref);

  const updated = ctx.db.transaction((tx) => {
    const row = tx
      .update(tasks)
      .set({
        leaseHolderId: ctx.actor.id,
        leaseExpiresAt: expiresAt,
        status: sql`case when ${tasks.status} = 'open' then 'in-progress' else ${tasks.status} end`,
        assigneeId: sql`coalesce(${tasks.assigneeId}, ${ctx.actor.id})`,
        updatedAt: at,
      })
      .where(
        and(
          eq(tasks.id, input.ref),
          notInArray(tasks.status, ["inbox", ...CLOSED_STATUSES]),
          or(
            isNull(tasks.leaseHolderId),
            lte(tasks.leaseExpiresAt, at),
            eq(tasks.leaseHolderId, ctx.actor.id),
          ),
        ),
      )
      .returning()
      .get();
    if (row) {
      const renewed = before.leaseHolderId === ctx.actor.id && (before.leaseExpiresAt ?? "") > at;
      logEvent(tx, row.id, ctx.actor.id, "claim", at, null, { expiresAt, renewed });
    }
    return row;
  });

  if (!updated) {
    if (before.status === "inbox") {
      throw new BaconError("conflict", `${formatRef(before.id)} is still in the inbox; triage it first`);
    }
    if (isClosed(before.status)) {
      throw new BaconError("conflict", `${formatRef(before.id)} is ${before.status}`);
    }
    // Anything else means another identity took the lease between our
    // read and the UPDATE, so report who holds it now.
    throw leaseConflict(ctx, loadTask(ctx, input.ref));
  }
  return view(updated, names(ctx), at);
}

export function releaseTask(ctx: Ctx, input: z.infer<typeof releaseInput>): TaskView {
  requireStaff(ctx);
  const at = stamp(ctx);
  const task = loadTask(ctx, input.ref);
  if (task.leaseHolderId !== ctx.actor.id && ctx.actor.kind !== "owner") {
    throw new BaconError("conflict", `you do not hold the lease on ${formatRef(task.id)}`);
  }
  const status = input.status ?? (task.status === "in-progress" ? "open" : task.status);
  const updated = ctx.db.transaction((tx) => {
    const row = tx
      .update(tasks)
      .set({ leaseHolderId: null, leaseExpiresAt: null, status, updatedAt: at })
      .where(eq(tasks.id, task.id))
      .returning()
      .get();
    logEvent(tx, task.id, ctx.actor.id, "release", at, input.note, { status });
    return row;
  });
  return view(updated, names(ctx), at);
}

export function completeTask(ctx: Ctx, input: z.infer<typeof completeInput>): TaskView {
  requireStaff(ctx);
  const at = stamp(ctx);
  const task = loadTask(ctx, input.ref);
  requireNoForeignLease(ctx, task, at);
  if (task.status === "done") return view(task, names(ctx), at);
  const updated = ctx.db.transaction((tx) => {
    const row = tx
      .update(tasks)
      .set({ status: "done", closedAt: at, leaseHolderId: null, leaseExpiresAt: null, updatedAt: at })
      .where(eq(tasks.id, task.id))
      .returning()
      .get();
    logEvent(tx, task.id, ctx.actor.id, "status", at, input.summary, {
      changes: { status: [task.status, "done"] },
    });
    return row;
  });
  return view(updated, names(ctx), at);
}

function note(ctx: Ctx, input: z.infer<typeof noteInput>, type: "progress" | "comment") {
  const at = stamp(ctx);
  const task = loadTask(ctx, input.ref);
  ctx.db.transaction((tx) => {
    logEvent(tx, task.id, ctx.actor.id, type, at, input.body);
    tx.update(tasks).set({ updatedAt: at }).where(eq(tasks.id, task.id)).run();
  });
  return { ref: formatRef(task.id), ok: true as const };
}

export function logProgress(ctx: Ctx, input: z.infer<typeof noteInput>) {
  requireStaff(ctx);
  return note(ctx, input, "progress");
}

/** Comments are the one write a requester can make, and only on their own
 * requests (loadTask enforces that). */
export function addComment(ctx: Ctx, input: z.infer<typeof noteInput>) {
  return note(ctx, input, "comment");
}

export function addLink(ctx: Ctx, input: z.infer<typeof linkInput>) {
  requireStaff(ctx);
  const at = stamp(ctx);
  const task = loadTask(ctx, input.ref);
  logEvent(ctx.db, task.id, ctx.actor.id, "link", at, input.label ?? null, { url: input.url });
  return { ref: formatRef(task.id), ok: true as const };
}

// ---- Inbox --------------------------------------------------------------

export function listInbox(ctx: Ctx): TaskView[] {
  requireStaff(ctx);
  const rows = ctx.db
    .select()
    .from(tasks)
    .where(eq(tasks.status, "inbox"))
    .orderBy(asc(tasks.id))
    .all();
  const who = names(ctx);
  const at = stamp(ctx);
  return rows.map((t) => view(t, who, at));
}

export function triageRequest(ctx: Ctx, input: z.infer<typeof triageInput>): TaskView {
  requireStaff(ctx);
  const at = stamp(ctx);
  const task = loadTask(ctx, input.ref);
  if (task.status !== "inbox") {
    throw new BaconError("conflict", `${formatRef(task.id)} is not in the inbox`);
  }
  if (input.accept && !input.space) {
    throw new BaconError("invalid", "accepting a request needs a space");
  }
  if (!input.accept && !input.note) {
    throw new BaconError("invalid", "rejecting a request needs a note for the requester");
  }
  const patch: Partial<Task> = input.accept
    ? {
        status: "open",
        space: input.space,
        priority: input.priority ?? task.priority,
        assigneeId: resolveWho(ctx, input.assignee) ?? task.assigneeId,
        updatedAt: at,
      }
    : { status: "canceled", closedAt: at, updatedAt: at };
  const updated = ctx.db.transaction((tx) => {
    const row = tx.update(tasks).set(patch).where(eq(tasks.id, task.id)).returning().get();
    logEvent(tx, task.id, ctx.actor.id, "triage", at, input.note, {
      accepted: input.accept,
      space: input.space ?? null,
    });
    return row;
  });
  return view(updated, names(ctx), at);
}

// ---- Approvals ----------------------------------------------------------

export function requestApproval(ctx: Ctx, input: z.infer<typeof requestApprovalInput>): Approval {
  requireStaff(ctx);
  const at = stamp(ctx);
  const task = loadTask(ctx, input.ref);
  return ctx.db.transaction((tx) => {
    const row = tx
      .insert(approvals)
      .values({
        taskId: task.id,
        requestedById: ctx.actor.id,
        action: input.action,
        payload: input.payload ?? null,
        createdAt: at,
      })
      .returning()
      .get();
    logEvent(tx, task.id, ctx.actor.id, "approval", at, input.action, {
      approvalId: row.id,
      state: "pending",
    });
    return row;
  });
}

export type ApprovalView = Approval & { ref: string; taskTitle: string; requestedBy: string };

export function listApprovals(ctx: Ctx, state: Approval["state"] = "pending"): ApprovalView[] {
  requireStaff(ctx);
  const rows = ctx.db
    .select({ approval: approvals, taskTitle: tasks.title })
    .from(approvals)
    .innerJoin(tasks, eq(tasks.id, approvals.taskId))
    .where(eq(approvals.state, state))
    .orderBy(asc(approvals.id))
    .all();
  const who = names(ctx);
  return rows.map(({ approval, taskTitle }) => ({
    ...approval,
    ref: formatRef(approval.taskId),
    taskTitle,
    requestedBy: who.get(approval.requestedById)?.name ?? "",
  }));
}

/** Owner only, and only from the web UI: an agent must never be able to
 * approve its own request. The conditional UPDATE makes a double click
 * (or two tabs) decide once. */
export function decideApproval(ctx: Ctx, input: z.infer<typeof decideApprovalInput>): Approval {
  requireOwner(ctx);
  const at = stamp(ctx);
  const state = input.approve ? "approved" : "rejected";
  return ctx.db.transaction((tx) => {
    const row = tx
      .update(approvals)
      .set({ state, decidedById: ctx.actor.id, decidedAt: at, decisionNote: input.note ?? null })
      .where(and(eq(approvals.id, input.id), eq(approvals.state, "pending")))
      .returning()
      .get();
    if (!row) throw new BaconError("conflict", `approval ${input.id} is not pending`);
    logEvent(tx, row.taskId, ctx.actor.id, "approval", at, input.note, { approvalId: row.id, state });
    return row;
  });
}

// ---- Identities ---------------------------------------------------------

export type IdentityView = Pick<Identity, "id" | "name" | "kind" | "email" | "createdAt" | "revokedAt"> & {
  hasToken: boolean;
};

export function listIdentities(ctx: Ctx): IdentityView[] {
  requireOwner(ctx);
  return ctx.db
    .select()
    .from(identities)
    .orderBy(asc(identities.id))
    .all()
    .map(({ tokenHash, ...rest }) => ({ ...rest, hasToken: tokenHash !== null }));
}

/** Returns the bearer token once. Only its hash is stored. */
export function createIdentity(
  ctx: Ctx,
  input: { name: string; kind: IdentityKind; email?: string | null },
): { identity: IdentityView; token: string } {
  requireOwner(ctx);
  const name = input.name.trim();
  if (!/^[\w .@-]{1,80}$/.test(name) || name.toLowerCase() === "me") {
    throw new BaconError("invalid", "names are 1–80 letters, digits, spaces, . @ _ or -, and not \"me\"");
  }
  const taken = ctx.db
    .select({ id: identities.id })
    .from(identities)
    .where(
      input.email
        ? or(sql`lower(${identities.name}) = lower(${name})`, eq(identities.email, input.email.toLowerCase()))
        : sql`lower(${identities.name}) = lower(${name})`,
    )
    .get();
  if (taken) throw new BaconError("conflict", "an identity with that name or email already exists");
  const { token, hash } = mintToken();
  const row = ctx.db
    .insert(identities)
    .values({
      name,
      kind: input.kind,
      email: input.email ? input.email.toLowerCase() : null,
      tokenHash: hash,
      createdAt: stamp(ctx),
    })
    .returning()
    .get();
  const { tokenHash, ...rest } = row;
  return { identity: { ...rest, hasToken: tokenHash !== null }, token };
}

export function rotateToken(ctx: Ctx, id: number): string {
  requireOwner(ctx);
  const { token, hash } = mintToken();
  const row = ctx.db
    .update(identities)
    .set({ tokenHash: hash })
    .where(and(eq(identities.id, id), isNull(identities.revokedAt)))
    .returning()
    .get();
  if (!row) throw new BaconError("not_found", "no active identity with that id");
  return token;
}

export function revokeIdentity(ctx: Ctx, id: number): void {
  requireOwner(ctx);
  if (id === ctx.actor.id) throw new BaconError("invalid", "you cannot revoke yourself");
  const row = ctx.db
    .update(identities)
    .set({ revokedAt: stamp(ctx), tokenHash: null })
    .where(and(eq(identities.id, id), isNull(identities.revokedAt)))
    .returning()
    .get();
  if (!row) throw new BaconError("not_found", "no active identity with that id");
}

/**
 * Maps a verified Cloudflare Access email to an identity. The configured
 * owner email is created on first sign-in, which is how a fresh database
 * gets its owner without a seed script.
 */
export function identityForEmail(db: Db, email: string, ownerEmail: string | undefined): Identity | null {
  const normalized = email.trim().toLowerCase();
  const existing = db
    .select()
    .from(identities)
    .where(and(eq(identities.email, normalized), isNull(identities.revokedAt)))
    .get();
  if (existing) return existing;
  if (!ownerEmail || normalized !== ownerEmail.trim().toLowerCase()) return null;
  const anyOwner = db.select().from(identities).where(eq(identities.kind, "owner")).get();
  if (anyOwner) return null;
  return db
    .insert(identities)
    .values({ name: normalized.split("@")[0], kind: "owner", email: normalized })
    .returning()
    .get();
}
