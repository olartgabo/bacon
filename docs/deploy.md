# Deploying bacon on Theseus

Theseus runs Debian with Coolify (olympus decision 0006). bacon is one Coolify
application built from this repo's `Dockerfile`. Cloudflare Tunnel carries
`tasks.olartgabo.dev` to it, and Cloudflare Access sits in front of the web UI.

## 1. Coolify application

1. New resource → Application → Public or private repository →
   `olartgabo/bacon`, branch `main`, build pack **Dockerfile**.
2. Port: `3000`. No public port mapping is needed beyond what the tunnel uses.
3. Persistent storage: a volume mounted at **`/data`**. It holds
   `bacon.sqlite` (every task) and the olympus checkout. Losing it loses data.
4. Healthcheck: the image declares one (`/api/health`). Leave Coolify's
   default or point it at `/api/health`.
5. Environment variables:

| Variable | Value | Secret |
|---|---|---|
| `BACON_OWNER_EMAIL` | the email you sign in to Access with | no |
| `CF_ACCESS_TEAM_DOMAIN` | `olartgabo.cloudflareaccess.com` | no |
| `CF_ACCESS_AUD` | the Access application's AUD tag (step 3) | no |
| `BACON_PUBLIC_URL` | `https://tasks.olartgabo.dev` | no |
| `OLYMPUS_REPO_URL` | `git@github.com:olartgabo/olympus.git` | no |
| `OLYMPUS_DEPLOY_KEY` | private half of the deploy key (step 4) | **yes** |
| `BACON_EXPORT_MINUTES` | `15` (leave empty until the key works) | no |

`DATABASE_PATH` and `OLYMPUS_REPO_PATH` default to `/data/...` in the image.
Never set `BACON_DEV_EMAIL` here; it is ignored in production anyway.

Deploys: enable Coolify's automatic deployment on push if its webhook is
reachable from GitHub, or press Redeploy after CI is green. CI
(`.github/workflows/ci.yml`) builds and smoke-tests the same image.

## 2. Tunnel

Run a `cloudflared` connector on Theseus for the existing tunnel (or a new
one) and point `tasks.olartgabo.dev` at the port Coolify exposes for bacon.
Once Theseus serves the hostname, the connector on `olympus-dashboard-host`
can be removed.

## 3. Access application

The existing `tasks.olartgabo.dev` application keeps its `gabriel-only`
policy. Add:

- **Bypass** for path `/api/mcp`. Agents authenticate with bearer tokens, and
  the app rejects requests without a valid one (401).
- **Allow** for requester emails on `/request*`, `/no-access`, and `/_next/*`
  (assets those pages load).

Copy the application's **AUD tag** (Overview tab) into `CF_ACCESS_AUD`. The
app verifies every `Cf-Access-Jwt-Assertion` against the team's signing keys
with that audience; without it, nobody can sign in.

## 4. olympus deploy key (export)

```
ssh-keygen -t ed25519 -N "" -C "bacon export" -f bacon_olympus
```

Add `bacon_olympus.pub` to `olartgabo/olympus` → Settings → Deploy keys with
**Allow write access**. Paste `bacon_olympus` (private) into
`OLYMPUS_DEPLOY_KEY` in Coolify, then delete both local files. On start the
container clones olympus into `/data/olympus`; with `BACON_EXPORT_MINUTES`
set, it pushes `tasks/bacon/` snapshots.

## 5. First run

1. Open `https://tasks.olartgabo.dev`, sign in through Access. The first
   sign-in with `BACON_OWNER_EMAIL` creates the owner identity.
2. Settings → Import from olympus: copies olympus `tasks/` and `captures/`.
3. Settings → Add identity: one **agent** per device (ithaca, theseus,
   odysseus, telemachus) and per requester. Each token is shown once.
4. On each device:

```
claude mcp add --transport http bacon https://tasks.olartgabo.dev/api/mcp \
  --header "Authorization: Bearer bcn_…"
```

5. Check: `curl -s -o /dev/null -w '%{http_code}' -X POST https://tasks.olartgabo.dev/api/mcp`
   returns `401` (reachable, and Access is bypassed for MCP).

## Backups

Not set up yet: it needs a destination off Theseus. Once one is chosen, a
Coolify scheduled task can run SQLite's online backup against the live file
(`/data/bacon.sqlite`) on a schedule; `cp` of a WAL-mode database is not a
safe backup.
