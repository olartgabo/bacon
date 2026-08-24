#!/usr/bin/env node
/**
 * CLI task capture — POSTs a new capture to the dashboard API.
 * Usage: node scripts/capture.mjs "title" --domain work [--status open]
 * Requires DASHBOARD_API_URL (e.g. http://localhost:3000). Against the
 * deployed origin, also set CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET
 * (a Cloudflare Access service token) — see
 * tasks/0007-dashboard-task-capture.md in olympus.
 */
// Kept as plain literals (not imported from src/lib/db/schema.ts) so this
// script runs under plain `node` on any device, no TypeScript toolchain
// required. Keep in sync with schema.ts's DOMAINS/STATUSES by hand.
const DOMAINS = [
  "work",
  "university",
  "aws",
  "student-community-day",
  "quantum",
  "personal",
  "projects",
];
const STATUSES = ["open", "in-progress", "done"];

const apiUrl = process.env.DASHBOARD_API_URL;
if (!apiUrl) {
  console.error("Set DASHBOARD_API_URL before running capture.mjs.");
  process.exit(1);
}

const args = process.argv.slice(2);
const title = args.find((a) => !a.startsWith("--"));
if (!title) {
  console.error('Usage: node scripts/capture.mjs "title" --domain <domain> [--status <status>]');
  process.exit(1);
}

function flag(name) {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
}

const domain = flag("domain");
const status = flag("status");

if (!domain || !DOMAINS.includes(domain)) {
  console.error(`--domain is required and must be one of: ${DOMAINS.join(", ")}`);
  process.exit(1);
}
if (status && !STATUSES.includes(status)) {
  console.error(`--status must be one of: ${STATUSES.join(", ")}`);
  process.exit(1);
}

const accessHeaders = {};
if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
  accessHeaders["CF-Access-Client-Id"] = process.env.CF_ACCESS_CLIENT_ID;
  accessHeaders["CF-Access-Client-Secret"] = process.env.CF_ACCESS_CLIENT_SECRET;
}

const res = await fetch(`${apiUrl}/api/captures`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...accessHeaders },
  body: JSON.stringify({ title, domain, status, source: "cli" }),
});

if (!res.ok) {
  const body = await res.json().catch(() => ({}));
  console.error(`capture failed (${res.status}): ${body.error ?? "unknown error"}`);
  process.exit(1);
}

const { capture } = await res.json();
console.log(`captured #${capture.id}: ${capture.title} [${capture.domain}]`);
