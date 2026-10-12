# bacon

An agent-first task tracker, served at `tasks.olartgabo.dev`. Agents create,
claim, and update tasks over an HTTP MCP endpoint. Gabriel triages and reviews
in the web UI, and a few outside requesters file requests into an inbox.

bacon is stage 2 of the dashboard plan in
[olympus](https://github.com/olartgabo/olympus) (`docs/web-dashboard-stack.md`).
It started as the read-only `tasks` repo, and that history is preserved here.
SQLite is the source of truth. A scheduled export writes Markdown snapshots back
into `olympus/tasks/bacon/` so agents reading the repo still see the work.

## Design

The brand source is `design/bacon-source.svg`, which uses cream `#FDF5EA`, ink
`#29292D`, and red `#D45545`. Tokens and components live in `src/design/`, and
`/design` renders the style guide.

## Dev

```
npm install
cp .env.example .env.local   # set OLYMPUS_REPO_PATH to your olympus checkout
npm run dev
```

## Status

Stage 2 in progress. Today the app still renders olympus Markdown read-only and
accepts captures. The MCP endpoint, identities, leases, the inbox, and approvals
are being built.
