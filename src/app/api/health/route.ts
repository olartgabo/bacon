import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** For Coolify's container healthcheck. Opening the DB also applies
 * pending migrations, so a failed migration shows up as unhealthy rather
 * than as errors on the first real request. */
export function GET() {
  getDb().run(sql`select 1`);
  return Response.json({ ok: true });
}
