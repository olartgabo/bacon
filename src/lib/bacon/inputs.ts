import { z } from "zod";
import { PRIORITIES, SPACES, TASK_STATUSES } from "./model";

/** Accepts "BCN-42", "bcn-42", "42", or 42. */
export const taskRef = z
  .union([z.number().int().positive(), z.string().trim()])
  .transform((v, ctx) => {
    if (typeof v === "number") return v;
    const m = /^(?:bcn-)?(\d+)$/i.exec(v);
    if (!m) {
      ctx.addIssue({ code: "custom", message: `"${v}" is not a task ref like BCN-42` });
      return z.NEVER;
    }
    return Number(m[1]);
  })
  .describe('Task ref, e.g. "BCN-42"');

const title = z.string().trim().min(1).max(200);
const body = z.string().max(20_000);
const space = z.enum(SPACES);
const status = z.enum(TASK_STATUSES);
const priority = z.enum(PRIORITIES);
const due = z.iso.date().describe("Calendar date, YYYY-MM-DD");
/** An identity name, or "me" for the caller. */
const who = z.string().trim().min(1).max(80);

export const createTaskInput = z.object({
  title,
  body: body.optional(),
  space: space.optional().describe("Leave out to file into the inbox for triage"),
  status: status.optional(),
  priority: priority.optional(),
  due: due.optional(),
  assignee: who.optional().describe('Identity name, or "me"'),
});

export const updateTaskInput = z.object({
  ref: taskRef,
  title: title.optional(),
  body: body.optional(),
  space: space.optional(),
  status: status.optional(),
  priority: priority.optional(),
  due: due.nullable().optional().describe("YYYY-MM-DD, or null to clear"),
  assignee: who.nullable().optional().describe('Identity name, "me", or null to unassign'),
});

export const listTasksInput = z.object({
  space: space.optional(),
  status: z.array(status).optional().describe("Defaults to every status except done and canceled"),
  assignee: who.optional().describe('Identity name, or "me"'),
  createdBy: who.optional(),
  dueBefore: due.optional(),
  q: z.string().trim().max(200).optional().describe("Substring match on title and body"),
  limit: z.number().int().min(1).max(200).optional(),
});

export const claimInput = z.object({
  ref: taskRef,
  minutes: z
    .number()
    .int()
    .min(5)
    .max(240)
    .optional()
    .describe("Lease length. Default 30. Claim again before it expires to renew."),
});

export const releaseInput = z.object({
  ref: taskRef,
  status: z
    .enum(["open", "blocked", "waiting"])
    .optional()
    .describe("Where the task goes when you let go of it. Default open."),
  note: body.optional(),
});

export const completeInput = z.object({
  ref: taskRef,
  summary: body.optional().describe("What was done, for the timeline"),
});

export const noteInput = z.object({ ref: taskRef, body: body.min(1) });

export const linkInput = z.object({
  ref: taskRef,
  url: z.url({ protocol: /^https?$/ }),
  label: z.string().trim().max(120).optional().describe('e.g. "PR #12"'),
});

export const triageInput = z.object({
  ref: taskRef,
  accept: z.boolean(),
  space: space.optional().describe("Required when accepting"),
  priority: priority.optional(),
  assignee: who.optional(),
  note: body.optional().describe("Shown to the requester. Required when rejecting."),
});

export const requestApprovalInput = z.object({
  ref: taskRef,
  action: z.string().trim().min(1).max(500).describe("What you want to do, concretely"),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const decideApprovalInput = z.object({
  id: z.number().int().positive(),
  approve: z.boolean(),
  note: body.optional(),
});

export const createRequestInput = z.object({
  title,
  body: body.optional(),
  due: due.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskInput>;
export type UpdateTaskInput = z.infer<typeof updateTaskInput>;
export type ListTasksInput = z.infer<typeof listTasksInput>;
