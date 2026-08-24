import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { captures, DOMAINS, STATUSES, SOURCES } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const syncedParam = req.nextUrl.searchParams.get("synced");
  const rows =
    syncedParam === null
      ? db.select().from(captures).all()
      : db
          .select()
          .from(captures)
          .where(eq(captures.synced, syncedParam === "true"))
          .all();
  return NextResponse.json({ captures: rows });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { title, domain, status, due, source, createdBy } = body as Record<
    string,
    unknown
  >;

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (typeof domain !== "string" || !DOMAINS.includes(domain as (typeof DOMAINS)[number])) {
    return NextResponse.json(
      { error: `domain must be one of: ${DOMAINS.join(", ")}` },
      { status: 400 },
    );
  }
  if (status !== undefined && !STATUSES.includes(status as (typeof STATUSES)[number])) {
    return NextResponse.json(
      { error: `status must be one of: ${STATUSES.join(", ")}` },
      { status: 400 },
    );
  }
  if (source !== undefined && !SOURCES.includes(source as (typeof SOURCES)[number])) {
    return NextResponse.json(
      { error: `source must be one of: ${SOURCES.join(", ")}` },
      { status: 400 },
    );
  }

  const row = db
    .insert(captures)
    .values({
      title: title.trim(),
      domain,
      status: (status as string | undefined) ?? "open",
      due: typeof due === "string" ? due : null,
      source: (source as string | undefined) ?? "web",
      createdBy: typeof createdBy === "string" ? createdBy : null,
    })
    .returning()
    .get();

  return NextResponse.json({ capture: row }, { status: 201 });
}
