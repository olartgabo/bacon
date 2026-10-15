import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { openDb, type Db } from "@/lib/db/client";
import { identities, type Identity } from "@/lib/db/schema";
import { buildMcpServer } from "./mcp";

async function connect(db: Db, actor: Identity) {
  const server = buildMcpServer({ db, actor });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(clientSide);
  return client;
}

function setup() {
  const db = openDb(":memory:");
  const add = (name: string, kind: Identity["kind"]) =>
    db.insert(identities).values({ name, kind }).returning().get();
  return { db, agent: add("ithaca", "agent"), requester: add("ana", "requester") };
}

const text = (result: Awaited<ReturnType<Client["callTool"]>>) =>
  (result.content as { type: string; text: string }[])[0].text;

describe("mcp tool surface", () => {
  it("gives requesters only the request tools", async () => {
    const { db, requester } = setup();
    const client = await connect(db, requester);
    const names = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "comment_on_my_request",
      "create_request",
      "get_my_request",
      "list_my_requests",
      "whoami",
    ]);

    const denied = await client.callTool({ name: "create_task", arguments: { title: "x", space: "work" } });
    expect(denied.isError).toBe(true);
  });

  it("gives agents the full task surface and server instructions", async () => {
    const { db, agent } = setup();
    const client = await connect(db, agent);
    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(["claim_task", "triage_request", "request_approval"]));
    expect(names).not.toContain("create_request");
    expect(client.getInstructions()).toMatch(/claim_task/);
  });

  it("round-trips a task and accepts BCN refs", async () => {
    const { db, agent } = setup();
    const client = await connect(db, agent);
    const created = JSON.parse(
      text(await client.callTool({ name: "create_task", arguments: { title: "Ship MCP", space: "projects" } })),
    );
    expect(created.ref).toBe("BCN-1");

    const claimed = JSON.parse(text(await client.callTool({ name: "claim_task", arguments: { ref: "BCN-1" } })));
    expect(claimed.lease.holder).toBe("ithaca");
  });

  it("reports service errors as tool errors with the code", async () => {
    const { db, agent } = setup();
    const client = await connect(db, agent);
    const result = await client.callTool({ name: "get_task", arguments: { ref: "BCN-99" } });
    expect(result.isError).toBe(true);
    expect(text(result)).toBe("not_found: BCN-99 not found");
  });

  it("rejects invalid input before it reaches the service", async () => {
    const { db, agent } = setup();
    const client = await connect(db, agent);
    const result = await client.callTool({
      name: "add_link",
      arguments: { ref: "BCN-1", url: "javascript:alert(1)" },
    });
    expect(result.isError).toBe(true);
  });
});
