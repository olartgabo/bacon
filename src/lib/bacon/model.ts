/**
 * The task vocabulary shared by the schema, the service layer, the MCP
 * tools, and the UI. Kept free of server imports so client components can
 * use it too.
 */

/** The seven context domains from olympus/context.md. */
export const SPACES = [
  "work",
  "university",
  "aws",
  "student-community-day",
  "quantum",
  "personal",
  "projects",
] as const;
export type Space = (typeof SPACES)[number];

/**
 * `inbox` holds untriaged requests. `blocked` means something must change
 * before work can continue, while `waiting` means someone else owes a reply.
 * Agents never pick up either one as do-now work.
 */
export const TASK_STATUSES = [
  "inbox",
  "open",
  "in-progress",
  "blocked",
  "waiting",
  "done",
  "canceled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const CLOSED_STATUSES: readonly TaskStatus[] = ["done", "canceled"];

export const PRIORITIES = ["urgent", "high", "normal", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const SOURCES = ["web", "cli", "telegram", "agent", "mcp", "import"] as const;
export type Source = (typeof SOURCES)[number];

export const IDENTITY_KINDS = ["owner", "agent", "requester"] as const;
export type IdentityKind = (typeof IDENTITY_KINDS)[number];

export const EVENT_TYPES = [
  "created",
  "comment",
  "progress",
  "status",
  "update",
  "claim",
  "release",
  "link",
  "triage",
  "approval",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const APPROVAL_STATES = ["pending", "approved", "rejected"] as const;
export type ApprovalState = (typeof APPROVAL_STATES)[number];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  inbox: "Inbox",
  open: "Open",
  "in-progress": "In progress",
  blocked: "Blocked",
  waiting: "Waiting",
  done: "Done",
  canceled: "Canceled",
};

export const SPACE_LABEL: Record<Space, string> = {
  work: "Work",
  university: "University",
  aws: "AWS",
  "student-community-day": "Student Community Day",
  quantum: "Quantum",
  personal: "Personal",
  projects: "Projects",
};
