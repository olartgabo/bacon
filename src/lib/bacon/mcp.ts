import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as inputs from "./inputs";
import * as svc from "./service";
import { APPROVAL_STATES, TASK_STATUSES } from "./model";

const STAFF_INSTRUCTIONS = `bacon is the task tracker shared by Gabriel and his agents (Ithaca, Theseus, Odysseus, Telemachus, Claude Code sessions). Tasks are referred to as BCN-<n>.

How to work:
- Before starting a task, claim_task it. The lease lasts 30 minutes by default; claim again to renew while you are still working. Never work on a task someone else holds.
- After meaningful progress (code pushed, research done, a decision, a blocker), log_progress with a short factual note. Skip trivial reads.
- Attach PRs, docs, and deploys with add_link.
- When finished, complete_task with a one-paragraph summary. If you stop early, release_task and set status blocked or waiting with a note saying why.
- When recommending what to do next, rank by importance. Never offer blocked or waiting tasks as do-now work; suggest a follow-up instead.
- Anything that sends email, posts publicly, spends money, or changes production needs request_approval first. Gabriel decides approvals in the web UI. Do not act until the approval shows approved in get_task.
- Requests from outside people arrive in list_inbox. Triage them: accept into a space, or reject with a note the requester will read.
- Requesters can read comments (add_comment) on their own requests, but never your progress notes or links.`;

const REQUESTER_INSTRUCTIONS = `bacon is Gabriel's task tracker. You can file requests for Gabriel and his agents, follow the requests you filed, and comment on them. You cannot see anyone else's tasks.

- create_request files a new request. Be specific: what you need, by when, and any links.
- list_my_requests and get_my_request show status and replies. "inbox" means not yet triaged.
- comment_on_my_request adds context or answers a question.`;

/** Service errors become tool errors the model can read and act on. Any
 * other exception is a bug and propagates to the SDK, which reports it as
 * a failed call. */
function run(fn: () => unknown): CallToolResult {
  try {
    return { content: [{ type: "text", text: JSON.stringify(fn()) }] };
  } catch (err) {
    if (err instanceof svc.BaconError) {
      return { isError: true, content: [{ type: "text", text: `${err.code}: ${err.message}` }] };
    }
    throw err;
  }
}

const read = { readOnlyHint: true, openWorldHint: false } as const;
const write = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;

export function buildMcpServer(ctx: svc.Ctx): McpServer {
  const staff = ctx.actor.kind !== "requester";
  const server = new McpServer(
    { name: "bacon", version: "0.1.0" },
    { instructions: staff ? STAFF_INSTRUCTIONS : REQUESTER_INSTRUCTIONS },
  );

  server.registerTool(
    "whoami",
    { title: "Who am I", description: "Your identity name and role in bacon.", annotations: read },
    () => run(() => svc.whoami(ctx)),
  );

  if (!staff) {
    registerRequesterTools(server, ctx);
    return server;
  }

  server.registerTool(
    "list_tasks",
    {
      title: "List tasks",
      description:
        "Filter tasks. Defaults to every open status (not done/canceled), sorted by priority, then due date. Pass several filters at once instead of calling repeatedly. Bodies are omitted; use get_task.",
      inputSchema: inputs.listTasksInput.shape,
      annotations: read,
    },
    (args) => run(() => svc.listTasks(ctx, args)),
  );

  server.registerTool(
    "get_task",
    {
      title: "Get task",
      description: "Full task: body, lease, recent timeline events (oldest first), and approvals.",
      inputSchema: { ref: inputs.taskRef, events: z.number().int().min(1).max(200).optional() },
      annotations: read,
    },
    (args) => run(() => svc.getTask(ctx, args.ref, args.events)),
  );

  server.registerTool(
    "create_task",
    {
      title: "Create task",
      description: "Create a task. Without a space it goes to the inbox for triage.",
      inputSchema: inputs.createTaskInput.shape,
      annotations: write,
    },
    (args) => run(() => svc.createTask(ctx, args, "mcp")),
  );

  server.registerTool(
    "update_task",
    {
      title: "Update task",
      description:
        "Change fields on a task. Only the fields you pass change. Fails if another agent holds the lease.",
      inputSchema: inputs.updateTaskInput.shape,
      annotations: write,
    },
    (args) => run(() => svc.updateTask(ctx, args)),
  );

  server.registerTool(
    "claim_task",
    {
      title: "Claim task",
      description:
        "Take (or renew) the lease on a task before working on it. Open tasks move to in-progress and are assigned to you if unassigned. Fails with the holder's name if someone else has it.",
      inputSchema: inputs.claimInput.shape,
      annotations: { ...write, idempotentHint: true },
    },
    (args) => run(() => svc.claimTask(ctx, args)),
  );

  server.registerTool(
    "release_task",
    {
      title: "Release task",
      description: "Give up your lease. Say why in the note if you are leaving it blocked or waiting.",
      inputSchema: inputs.releaseInput.shape,
      annotations: write,
    },
    (args) => run(() => svc.releaseTask(ctx, args)),
  );

  server.registerTool(
    "complete_task",
    {
      title: "Complete task",
      description: "Mark done, clear the lease, and record a summary on the timeline.",
      inputSchema: inputs.completeInput.shape,
      annotations: { ...write, idempotentHint: true },
    },
    (args) => run(() => svc.completeTask(ctx, args)),
  );

  server.registerTool(
    "log_progress",
    {
      title: "Log progress",
      description:
        "Add a working note to the timeline (what changed, what's next, blockers). Requesters do not see these.",
      inputSchema: inputs.noteInput.shape,
      annotations: write,
    },
    (args) => run(() => svc.logProgress(ctx, args)),
  );

  server.registerTool(
    "add_comment",
    {
      title: "Add comment",
      description: "Comment on a task. On a request, the requester can read it.",
      inputSchema: inputs.noteInput.shape,
      annotations: write,
    },
    (args) => run(() => svc.addComment(ctx, args)),
  );

  server.registerTool(
    "add_link",
    {
      title: "Add link",
      description: "Attach an http(s) URL (PR, doc, deploy) to a task.",
      inputSchema: inputs.linkInput.shape,
      annotations: write,
    },
    (args) => run(() => svc.addLink(ctx, args)),
  );

  server.registerTool(
    "list_inbox",
    {
      title: "List inbox",
      description: "Untriaged requests and tasks filed without a space, oldest first.",
      annotations: read,
    },
    () => run(() => svc.listInbox(ctx)),
  );

  server.registerTool(
    "triage_request",
    {
      title: "Triage request",
      description:
        "Accept an inbox item into a space (it becomes open), or reject it with a note the requester will read.",
      inputSchema: inputs.triageInput.shape,
      annotations: write,
    },
    (args) => run(() => svc.triageRequest(ctx, args)),
  );

  server.registerTool(
    "request_approval",
    {
      title: "Request approval",
      description:
        "Ask Gabriel to approve a risky action (send email, publish, spend, touch production). Wait for the decision in get_task before acting.",
      inputSchema: inputs.requestApprovalInput.shape,
      annotations: write,
    },
    (args) => run(() => svc.requestApproval(ctx, args)),
  );

  server.registerTool(
    "list_approvals",
    {
      title: "List approvals",
      description: "Approvals in a state (default pending).",
      inputSchema: { state: z.enum(APPROVAL_STATES).optional() },
      annotations: read,
    },
    (args) => run(() => svc.listApprovals(ctx, args.state)),
  );

  return server;
}

function registerRequesterTools(server: McpServer, ctx: svc.Ctx) {
  server.registerTool(
    "create_request",
    {
      title: "Create request",
      description: "File a request for Gabriel and his agents. It starts in the inbox until triaged.",
      inputSchema: inputs.createRequestInput.shape,
      annotations: write,
    },
    (args) => run(() => svc.createRequest(ctx, args, "mcp")),
  );

  server.registerTool(
    "list_my_requests",
    {
      title: "List my requests",
      description: "Requests you filed, including closed ones.",
      annotations: read,
    },
    () => run(() => svc.listTasks(ctx, { status: [...TASK_STATUSES] })),
  );

  server.registerTool(
    "get_my_request",
    {
      title: "Get my request",
      description: "One of your requests with its status, triage note, and comments.",
      inputSchema: { ref: inputs.taskRef },
      annotations: read,
    },
    (args) => run(() => svc.getTask(ctx, args.ref)),
  );

  server.registerTool(
    "comment_on_my_request",
    {
      title: "Comment on my request",
      description: "Add context or answer a question on one of your requests.",
      inputSchema: inputs.noteInput.shape,
      annotations: write,
    },
    (args) => run(() => svc.addComment(ctx, args)),
  );
}
