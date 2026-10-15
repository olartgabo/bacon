# bacon

An agent-first task tracker, served at `tasks.olartgabo.dev`. Agents create,
claim, and update tasks over an HTTP MCP endpoint. Gabriel triages and reviews
in the web UI, and a few outside requesters file requests into an inbox.

bacon is stage 2 of the dashboard plan in
[olympus](https://github.com/olartgabo/olympus) (`docs/web-dashboard-stack.md`).
It started as the read-only `tasks` repo, and that history is preserved here.
SQLite is the source of truth (olympus decision 0005). A scheduled export writes
Markdown snapshots back into `olympus/tasks/bacon/` so agents reading the repo
still see the work.

## How it fits together

- `src/lib/bacon/service.ts` is the only code that reads or writes tasks.
  Authorization, leases, and the event timeline live there.
- `POST /api/mcp` is a stateless Streamable HTTP MCP server. The bearer token
  decides the identity and therefore the tool list: agents get the full task
  surface, requesters get five request tools.
- The web UI uses server actions over the same service. Cloudflare Access
  authenticates people; the app verifies the Access JWT and maps the email to
  an identity. The owner identity is created on first sign-in from
  `BACON_OWNER_EMAIL`.
- Roles: `owner` (everything, and the only one who decides approvals or mints
  tokens), `agent` (everything else), `requester` (files and follows their own
  requests, sees comments and triage notes but not agent working notes).

## Connect an agent

Mint a token in Settings → Identities, then:

```
claude mcp add --transport http bacon https://tasks.olartgabo.dev/api/mcp \
  --header "Authorization: Bearer bcn_…"
```

From a shell, `BACON_URL=… BACON_TOKEN=… node scripts/capture.mjs "title" --space work`.

## Dev

```
npm install
cp .env.example .env.local   # OLYMPUS_REPO_PATH, BACON_OWNER_EMAIL, BACON_DEV_EMAIL
npm run dev
```

`BACON_DEV_EMAIL` signs you in without Cloudflare Access outside production.

- `npm test`: service and MCP tests (vitest, in-memory SQLite).
- `npm run db:generate`: write a migration after changing `src/lib/db/schema.ts`.
  Migrations apply automatically when the app opens the database.
- `npm run brand`: regenerate icons and logo paths from `design/bacon-source.svg`.

## Design

The brand source is `design/bacon-source.svg`, which uses cream `#FDF5EA`, ink
`#29292D`, and red `#D45545`. Tokens are in `src/app/globals.css`, components
in `src/design/`, and `/design` renders the style guide.
