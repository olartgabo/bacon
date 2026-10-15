import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getDb } from "@/lib/db/client";
import { buildMcpServer } from "@/lib/bacon/mcp";
import { identityFromBearer } from "@/lib/bacon/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stateless Streamable HTTP: every POST builds a server bound to the
 * caller's identity, answers with JSON, and is discarded. No sessions to
 * expire, and a revoked token stops working on the very next request.
 *
 * Cloudflare Access bypasses this path; the bearer token is the auth.
 */
export async function POST(req: Request): Promise<Response> {
  const db = getDb();
  const actor = identityFromBearer(db, req.headers.get("authorization"));
  if (!actor) {
    return Response.json(
      { error: "missing or invalid bearer token" },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="bacon"' } },
    );
  }

  const server = buildMcpServer({ db, actor });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    await server.close();
  }
}

// Stateless mode has no server-initiated stream to open or session to end.
const notAllowed = () =>
  Response.json({ error: "method not allowed" }, { status: 405, headers: { Allow: "POST" } });

export { notAllowed as GET, notAllowed as DELETE };
