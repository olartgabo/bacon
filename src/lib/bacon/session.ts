import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { getDb } from "@/lib/db/client";
import type { Identity } from "@/lib/db/schema";
import { identityForEmail, type Ctx } from "./service";

type Jwks = ReturnType<typeof createRemoteJWKSet>;
let jwks: { team: string; set: Jwks } | undefined;

function teamJwks(team: string): Jwks {
  if (jwks?.team !== team) {
    jwks = { team, set: createRemoteJWKSet(new URL(`https://${team}/cdn-cgi/access/certs`)) };
  }
  return jwks.set;
}

/**
 * The email Cloudflare Access authenticated, or null. The header is only
 * trusted after its signature, audience, and issuer check out: anyone who
 * reaches the origin directly could send a forged one.
 */
async function accessEmail(): Promise<string | null> {
  const h = await headers();
  const assertion = h.get("cf-access-jwt-assertion");
  const team = process.env.CF_ACCESS_TEAM_DOMAIN;
  const aud = process.env.CF_ACCESS_AUD;

  if (!assertion) {
    const dev = process.env.BACON_DEV_EMAIL;
    return process.env.NODE_ENV !== "production" && dev ? dev : null;
  }
  if (!team || !aud) return null;

  try {
    const { payload } = await jwtVerify(assertion, teamJwks(team), {
      audience: aud,
      issuer: `https://${team}`,
    });
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    // An invalid or expired assertion is the same as none: not signed in.
    return null;
  }
}

/** Per-request memo, so a page and its components verify the JWT once. */
export const currentIdentity = cache(async (): Promise<Identity | null> => {
  const email = await accessEmail();
  if (!email) return null;
  return identityForEmail(getDb(), email, process.env.BACON_OWNER_EMAIL);
});

/** For staff pages. Requesters are sent to their own page. */
export async function staffCtx(): Promise<Ctx> {
  const actor = await currentIdentity();
  if (!actor) redirect("/no-access");
  if (actor.kind === "requester") redirect("/request");
  return { db: getDb(), actor };
}

export async function ownerCtx(): Promise<Ctx> {
  const ctx = await staffCtx();
  if (ctx.actor.kind !== "owner") redirect("/");
  return ctx;
}

/** Any signed-in identity, including requesters. */
export async function anyCtx(): Promise<Ctx> {
  const actor = await currentIdentity();
  if (!actor) redirect("/no-access");
  return { db: getDb(), actor };
}
