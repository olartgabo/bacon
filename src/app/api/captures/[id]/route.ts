import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { captures, STATUSES } from "@/lib/db/schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { status, synced, markdownPath } = body as Record<string, unknown>;

  const patch: Partial<typeof captures.$inferInsert> = {};

  if (status !== undefined) {
    if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
      return NextResponse.json(
        { error: `status must be one of: ${STATUSES.join(", ")}` },
        { status: 400 },
      );
    }
    patch.status = status as string;
  }
  if (synced !== undefined) {
    if (typeof synced !== "boolean") {
      return NextResponse.json({ error: "synced must be a boolean" }, { status: 400 });
    }
    patch.synced = synced;
  }
  if (markdownPath !== undefined) {
    if (typeof markdownPath !== "string") {
      return NextResponse.json(
        { error: "markdownPath must be a string" },
        { status: 400 },
      );
    }
    patch.markdownPath = markdownPath;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const row = db
    .update(captures)
    .set(patch)
    .where(eq(captures.id, id))
    .returning()
    .get();

  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ capture: row });
}
