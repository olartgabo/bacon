# tasks.olartgabo.dev

Read-only dashboard over the [olympus](https://github.com/olartgabo/olympus)
coordination repo — stage 1 of `docs/web-dashboard-stack.md`'s build order in
that repo. Renders pending actions, tasks, decisions, and device logs straight
from Markdown. No database, no writes yet.

## Design

Shares its token system with `olartgabo.dev` (`src/app/globals.css`) — same
`--sheet` / `--ink` / `--object` / `--red` variable names, same mono-label
convention. This app only runs the dark "blueprint" act; there's no print
toggle, since this is a working tool on a screen, not a printable page.

## Dev

```
npm install
cp .env.example .env.local   # set OLYMPUS_REPO_PATH to your olympus checkout
npm run dev
```

## Status

Stage 1 only. Cloudflare Tunnel + Zero Trust Access, task capture (write
path), the Telegram bridge, and the approval queue are all separate,
still-open steps — see `docs/web-dashboard-stack.md` and `human/actions.md`
in the olympus repo.
