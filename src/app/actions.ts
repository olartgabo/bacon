"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import * as inputs from "@/lib/bacon/inputs";
import { IDENTITY_KINDS } from "@/lib/bacon/model";
import { importFromOlympus } from "@/lib/bacon/olympus-import";
import * as svc from "@/lib/bacon/service";
import { anyCtx, ownerCtx, staffCtx } from "@/lib/bacon/session";

export type ActionState = { error?: string; ok?: string; token?: string };

/** Empty form fields mean "not provided". */
function field(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

/** For fields a form always sends, where empty means "clear it". */
function clearable(fd: FormData, key: string): string | null | undefined {
  if (!fd.has(key)) return undefined;
  return field(fd, key) ?? null;
}

function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new svc.BaconError("invalid", `${issue.path.join(".") || "input"}: ${issue.message}`);
  }
  return result.data;
}

/** Service and validation errors become a message on the form. Anything
 * else is a bug and should surface in the error boundary and logs. */
async function attempt(fn: () => Promise<ActionState> | ActionState): Promise<ActionState> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof svc.BaconError) return { error: err.message };
    throw err;
  }
}

export async function createTaskAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await staffCtx();
  let ref = "";
  const state = await attempt(() => {
    const input = parse(inputs.createTaskInput, {
      title: field(fd, "title"),
      body: field(fd, "body"),
      space: field(fd, "space"),
      priority: field(fd, "priority"),
      due: field(fd, "due"),
      assignee: field(fd, "assignee"),
    });
    ref = svc.createTask(ctx, input, "web").ref;
    return {};
  });
  if (state.error) return state;
  revalidatePath("/", "layout");
  redirect(`/t/${ref}`);
}

export async function updateTaskAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await staffCtx();
  const state = await attempt(() => {
    const input = parse(inputs.updateTaskInput, {
      ref: field(fd, "ref"),
      title: field(fd, "title"),
      body: fd.has("body") ? String(fd.get("body")) : undefined,
      space: field(fd, "space"),
      status: field(fd, "status"),
      priority: field(fd, "priority"),
      due: clearable(fd, "due"),
      assignee: clearable(fd, "assignee"),
    });
    svc.updateTask(ctx, input);
    return { ok: "Saved" };
  });
  revalidatePath("/", "layout");
  return state;
}

export async function commentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await anyCtx();
  const state = await attempt(() => {
    svc.addComment(ctx, parse(inputs.noteInput, { ref: field(fd, "ref"), body: field(fd, "body") }));
    return { ok: "Posted" };
  });
  revalidatePath("/", "layout");
  return state;
}

export async function completeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await staffCtx();
  const state = await attempt(() => {
    svc.completeTask(ctx, parse(inputs.completeInput, { ref: field(fd, "ref"), summary: field(fd, "summary") }));
    return { ok: "Done" };
  });
  revalidatePath("/", "layout");
  return state;
}

export async function releaseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await staffCtx();
  const state = await attempt(() => {
    svc.releaseTask(ctx, parse(inputs.releaseInput, { ref: field(fd, "ref") }));
    return { ok: "Lease released" };
  });
  revalidatePath("/", "layout");
  return state;
}

export async function triageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await staffCtx();
  const state = await attempt(() => {
    const accept = fd.get("decision") === "accept";
    svc.triageRequest(
      ctx,
      parse(inputs.triageInput, {
        ref: field(fd, "ref"),
        accept,
        space: accept ? field(fd, "space") : undefined,
        priority: accept ? field(fd, "priority") : undefined,
        note: field(fd, "note"),
      }),
    );
    return { ok: accept ? "Accepted" : "Rejected" };
  });
  revalidatePath("/", "layout");
  return state;
}

export async function decideApprovalAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await ownerCtx();
  const state = await attempt(() => {
    const approve = fd.get("decision") === "approve";
    svc.decideApproval(
      ctx,
      parse(inputs.decideApprovalInput, { id: Number(field(fd, "id")), approve, note: field(fd, "note") }),
    );
    return { ok: approve ? "Approved" : "Rejected" };
  });
  revalidatePath("/", "layout");
  return state;
}

const identityForm = z.object({
  name: z.string().trim().min(1).max(80),
  kind: z.enum(IDENTITY_KINDS),
  email: z.email().optional(),
});

export async function createIdentityAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await ownerCtx();
  const state = await attempt(() => {
    const input = parse(identityForm, {
      name: field(fd, "name"),
      kind: field(fd, "kind"),
      email: field(fd, "email"),
    });
    const { identity, token } = svc.createIdentity(ctx, input);
    return { ok: `Created ${identity.name}`, token };
  });
  revalidatePath("/settings");
  return state;
}

export async function rotateTokenAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await ownerCtx();
  const state = await attempt(() => ({ ok: "New token", token: svc.rotateToken(ctx, Number(field(fd, "id"))) }));
  revalidatePath("/settings");
  return state;
}

export async function revokeIdentityAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await ownerCtx();
  const state = await attempt(() => {
    svc.revokeIdentity(ctx, Number(field(fd, "id")));
    return { ok: "Revoked" };
  });
  revalidatePath("/settings");
  return state;
}

export async function importOlympusAction(): Promise<ActionState> {
  const ctx = await ownerCtx();
  const repo = process.env.OLYMPUS_REPO_PATH;
  if (!repo) return { error: "OLYMPUS_REPO_PATH is not set on the server" };
  const state = await attempt(() => {
    const { imported, skipped } = importFromOlympus(ctx, repo);
    return { ok: `Imported ${imported.length} (${imported.join(", ") || "none"}), skipped ${skipped} already imported` };
  });
  revalidatePath("/", "layout");
  return state;
}

export async function createRequestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await anyCtx();
  let ref = "";
  const state = await attempt(() => {
    const input = parse(inputs.createRequestInput, {
      title: field(fd, "title"),
      body: field(fd, "body"),
      due: field(fd, "due"),
    });
    ref = svc.createRequest(ctx, input, "web").ref;
    return {};
  });
  if (state.error) return state;
  revalidatePath("/", "layout");
  redirect(`/request/${ref}`);
}
