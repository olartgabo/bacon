#!/usr/bin/env node
/**
 * Capture a task from any device:
 *
 *   node scripts/capture.mjs "Renew the AWS SCD credits" --space aws [--priority high] [--due 2026-11-01]
 *
 * Without --space the task lands in the inbox. Calls bacon's MCP endpoint
 * as the identity that owns BACON_TOKEN, so the capture is attributed like
 * any other agent write.
 *
 *   BACON_URL    e.g. https://tasks.olartgabo.dev (default http://localhost:3000)
 *   BACON_TOKEN  a bcn_… token minted in Settings → Identities
 */

const url = `${process.env.BACON_URL ?? "http://localhost:3000"}/api/mcp`;
const token = process.env.BACON_TOKEN;
if (!token) {
  console.error("Set BACON_TOKEN to a bcn_… token from Settings → Identities.");
  process.exit(1);
}

const args = process.argv.slice(2);
const title = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!title) {
  console.error('Usage: node scripts/capture.mjs "title" [--space <space>] [--priority <p>] [--due YYYY-MM-DD]');
  process.exit(1);
}

const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "create_task",
      arguments: { title, space: flag("space"), priority: flag("priority"), due: flag("due") },
    },
  }),
});

if (!res.ok) {
  console.error(`bacon returned ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const { result, error } = await res.json();
const text = result?.content?.[0]?.text ?? error?.message ?? "no response";
if (error || result?.isError) {
  console.error(text);
  process.exit(1);
}
const task = JSON.parse(text);
console.log(`${task.ref}  ${task.status}  ${task.title}`);
