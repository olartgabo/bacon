# Handoff: deploying bacon on Theseus

Written 2026-10-15 for whoever picks up the deploy on Theseus, which now runs
Debian with Coolify. `docs/deploy.md` has the reference steps. This file adds
the current state, the order to do things in, and the traps found so far.

## State

- **Code:** finished for the MVP. PR [olartgabo/bacon#1](https://github.com/olartgabo/bacon/pull/1)
  (branch `bacon/stage2`) is open and mergeable, and CI is green: the `check`
  job runs lint, tsc, 26 vitest tests and the build, and the `image` job
  builds the Dockerfile and smoke-tests health, MCP 401 and the `/` redirect.
- **Not merged.** `main` still has the old stage 1 app. Either merge PR #1
  first (recommended, since `docs/deploy.md` points Coolify at `main`) or
  point Coolify at `bacon/stage2` for the first deploy.
- **olympus:** branch `bacon/decision-0005-and-agent-rules` (commit 7fc9145)
  holds decisions 0005/0006, the agent rules in `AGENTS.md`, and the pending
  human actions. Pushed, not merged. Merge it once bacon is live, so agents
  don't get told to use a tracker that isn't up yet.
- **Verified locally:** the full flow on a dev server (requester request →
  agent claim, progress, approval request → owner triage and approve), the
  olympus import (8 imported, then 8 skipped on re-run), and the standalone
  production server (health 200, MCP 401, `/` → `/no-access`).
- **Never verified:** real Cloudflare Access sign-in, the export pushing to
  GitHub with a real deploy key, and the image running under Coolify. Docker
  Desktop doesn't start on Gabriel's Windows machine, so the image has only
  run in CI.

## Order of work

Each step can be checked before the next one starts.

1. **Merge PR #1** (or choose `bacon/stage2` in Coolify).
2. **Coolify app** (`docs/deploy.md` §1), with the env vars set like this for
   the first boot:
   - `BACON_OWNER_EMAIL`, `CF_ACCESS_TEAM_DOMAIN=olartgabo.cloudflareaccess.com`,
     `BACON_PUBLIC_URL=https://tasks.olartgabo.dev`.
   - Leave `CF_ACCESS_AUD`, `OLYMPUS_REPO_URL`, `OLYMPUS_DEPLOY_KEY` and
     `BACON_EXPORT_MINUTES` **empty** for now (see Traps).

   Check from Theseus: `curl -s localhost:<port>/api/health` returns
   `{"ok":true}`, and
   `curl -s -o /dev/null -w '%{http_code}' -X POST localhost:<port>/api/mcp`
   returns `401`.
3. **Tunnel** (§2). Install `cloudflared` on Theseus and run the connector
   for the tunnel that serves `tasks.olartgabo.dev`, pointing at bacon.
   There are two ways to do this:
   - Map the container port in Coolify (for example `3000:3000`) and point
     the tunnel at `http://localhost:3000`. This is the simplest.
   - Give the app a domain in Coolify and point the tunnel at Coolify's proxy
     (`http://localhost:80`) with the HTTP Host header set to
     `tasks.olartgabo.dev`.

   Then remove the connector on the Lightsail `olympus-dashboard-host`. Until
   then, two connectors serve the hostname and requests split between the old
   and new apps.
4. **Access** (§3): add a bypass on `/api/mcp`, and an allow policy for
   requesters on `/request*`, `/no-access` and `/_next/*`. Copy the AUD tag
   into `CF_ACCESS_AUD` and redeploy.

   Check: the public MCP POST returns `401`, not an Access login page. Signing
   in at `https://tasks.olartgabo.dev` with `BACON_OWNER_EMAIL` lands on Today,
   and that first sign-in creates the owner identity.
5. **Identities** (§5): in Settings, add one agent identity per device
   (ithaca, theseus, odysseus, telemachus). Each token is shown once. Register
   each device with
   `claude mcp add --transport http bacon https://tasks.olartgabo.dev/api/mcp --header "Authorization: Bearer bcn_…"`.
   Check: `whoami` over MCP returns the right identity.
6. **Export** (§4): create the deploy key and add it to olympus with write
   access. Then set `OLYMPUS_REPO_URL` and `OLYMPUS_DEPLOY_KEY`, redeploy,
   and confirm `/data/olympus` was cloned. Then run Settings → Import from
   olympus, set `BACON_EXPORT_MINUTES=15`, redeploy, and wait for a
   `tasks/bacon/` commit in olympus.
7. **Backups:** still need a destination off Theseus. Use SQLite's online
   backup (`sqlite3 /data/bacon.sqlite ".backup …"` or better-sqlite3's
   `db.backup()`). A plain `cp` of a WAL-mode database is not a safe backup.
8. Merge the olympus branch and retire Lightsail.

## Traps

- **The entrypoint is `set -eu`.** If `OLYMPUS_REPO_URL` is set but the deploy
  key is missing or not yet added on GitHub, `git clone` fails and the
  container exits on start. That is why the olympus vars stay empty until
  step 6.
- **`/data` must be writable by uid 1000** (`node`). A Coolify-managed
  volume picks up the image's ownership. A host bind mount comes up as root,
  and then SQLite can't open the database. Fix it with
  `chown -R 1000:1000 <host dir>`.
- **The MCP endpoint is stateless.** It answers `POST` only, and `GET` and
  `DELETE` return 405. Clients that insist on an SSE GET stream will complain.
  Claude Code's HTTP transport works, and so does `scripts/capture.mjs`.
- **Without `CF_ACCESS_AUD`, nobody can sign in to the web UI.** Every page
  except `/api/*` redirects to `/no-access`. That is expected until step 4.
- **`BACON_DEV_EMAIL` is ignored in production.** Don't set it on Theseus.
- **The build needs python3, make and g++ in the deps stage.** npm runs
  `node-gyp rebuild` for better-sqlite3 even though prebuilt binaries exist.
  Removing them broke CI once.
- **The image pins GitHub's ed25519 host key** in `~node/.ssh/known_hosts`.
  If GitHub rotates it, the clone and push fail with a host key error. Update
  the line in the `Dockerfile`.
- **Migrations run on startup** from `/app/drizzle` (`src/lib/db/client.ts`).
  A new schema change needs `npm run db:generate` and a committed migration.
  Never edit the SQLite file by hand.

## Open decisions (Gabriel)

- Is Hermes reinstalled on Debian? Its Windows setup went with the reformat.
- Where do backups go?
- Which requesters get invited first? Each one needs an Access allow entry
  and a requester identity in Settings.

## Where things are

| What | Where |
|---|---|
| Service (authz, leases, events) | `src/lib/bacon/service.ts` |
| MCP tools and role filtering | `src/lib/bacon/mcp.ts`, route `src/app/api/mcp/route.ts` |
| Access JWT check and identity mapping | `src/lib/bacon/session.ts` |
| Export loop | `src/instrumentation.ts`, `src/lib/bacon/olympus-export.ts` |
| Schema and migrations | `src/lib/db/schema.ts`, `drizzle/` |
| Image | `Dockerfile`, `docker/entrypoint.sh` |
| Deploy reference | `docs/deploy.md` |
| Full plan | `~/.claude/plans/bacon-is-a-personal-valiant-globe.md` on Gabriel's Windows machine (not in the repo) |
