import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { identities, type Identity } from "@/lib/db/schema";

// The prefix makes a leaked token recognizable to secret scanners and to a
// person reading a log.
const PREFIX = "bcn_";

/** 32 random bytes is far beyond guessable, so a plain SHA-256 (no salt,
 * no slow KDF) is enough to keep the stored hash useless to a DB thief. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function mintToken(): { token: string; hash: string } {
  const token = PREFIX + randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

/** Resolves an `Authorization: Bearer …` header to a live identity. */
export function identityFromBearer(db: Db, header: string | null): Identity | null {
  const m = header && /^Bearer\s+(\S+)$/i.exec(header);
  if (!m || !m[1].startsWith(PREFIX)) return null;
  return (
    db
      .select()
      .from(identities)
      .where(and(eq(identities.tokenHash, hashToken(m[1])), isNull(identities.revokedAt)))
      .get() ?? null
  );
}
