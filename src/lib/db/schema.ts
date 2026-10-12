import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type {
  ApprovalState,
  EventType,
  IdentityKind,
  Priority,
  Source,
  Space,
  TaskStatus,
} from "@/lib/bacon/model";

// Timestamps are ISO-8601 strings from Date#toISOString, so they compare
// correctly as text. Lease expiry checks in the service layer rely on that.
const now = () => new Date().toISOString();

export const identities = sqliteTable("identities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  kind: text("kind").$type<IdentityKind>().notNull(),
  /** Matched against the Cloudflare Access JWT email for web sessions. */
  email: text("email").unique(),
  /** SHA-256 hex of the bearer token. The token itself is shown once at
   * mint time and never stored. */
  tokenHash: text("token_hash").unique(),
  createdAt: text("created_at").notNull().$defaultFn(now),
  revokedAt: text("revoked_at"),
});

export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    /** Null while a request sits in the inbox; triage assigns one. */
    space: text("space").$type<Space>(),
    status: text("status").$type<TaskStatus>().notNull().default("open"),
    priority: text("priority").$type<Priority>().notNull().default("normal"),
    /** Calendar date, YYYY-MM-DD. */
    due: text("due"),
    assigneeId: integer("assignee_id").references(() => identities.id),
    createdById: integer("created_by_id")
      .notNull()
      .references(() => identities.id),
    source: text("source").$type<Source>().notNull().default("web"),
    leaseHolderId: integer("lease_holder_id").references(() => identities.id),
    leaseExpiresAt: text("lease_expires_at"),
    /** Stable key for imported rows (e.g. "olympus:tasks/0001-…") so the
     * import can run again without duplicating them. */
    externalKey: text("external_key").unique(),
    createdAt: text("created_at").notNull().$defaultFn(now),
    updatedAt: text("updated_at").notNull().$defaultFn(now),
    closedAt: text("closed_at"),
  },
  (t) => [
    index("tasks_status_idx").on(t.status),
    index("tasks_space_idx").on(t.space),
    index("tasks_assignee_idx").on(t.assigneeId),
    index("tasks_created_by_idx").on(t.createdById),
  ],
);

export const taskEvents = sqliteTable(
  "task_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id),
    actorId: integer("actor_id")
      .notNull()
      .references(() => identities.id),
    type: text("type").$type<EventType>().notNull(),
    body: text("body"),
    /** JSON: field diffs for updates, url/label for links, and so on. */
    data: text("data", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: text("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("task_events_task_idx").on(t.taskId, t.id)],
);

export const approvals = sqliteTable(
  "approvals",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id),
    requestedById: integer("requested_by_id")
      .notNull()
      .references(() => identities.id),
    /** What the agent wants to do, in its own words ("send email to …"). */
    action: text("action").notNull(),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>(),
    state: text("state").$type<ApprovalState>().notNull().default("pending"),
    decidedById: integer("decided_by_id").references(() => identities.id),
    decidedAt: text("decided_at"),
    decisionNote: text("decision_note"),
    createdAt: text("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("approvals_state_idx").on(t.state)],
);

export type Identity = typeof identities.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskEvent = typeof taskEvents.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
