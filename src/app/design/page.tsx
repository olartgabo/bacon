import type { Metadata } from "next";
import { BaconAppIcon, BaconLockup, BaconMark } from "@/design/brand";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  FieldLabel,
  Input,
  PriorityBadge,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
  TimelineItem,
} from "@/design/ui";
import { PRIORITIES, TASK_STATUSES } from "@/lib/bacon/model";

export const metadata: Metadata = { title: "Design" };

const SWATCHES = [
  ["paper", "page background"],
  ["card", "raised surface"],
  ["well", "inset, hover, tabs track"],
  ["line", "hairline"],
  ["line-strong", "field border"],
  ["ink", "primary text"],
  ["ink-dim", "secondary text"],
  ["ink-faint", "meta text"],
  ["brand", "marks, focus, fills"],
  ["brand-ink", "red text"],
  ["solid", "primary button"],
] as const;

export default function DesignPage() {
  return (
    <main className="shell py-10">
      <header className="mb-10">
        <p className="t-label">bacon design system</p>
        <h1 className="t-display mt-2">Design</h1>
        <p className="t-meta mt-2 max-w-[60ch]">
          Tokens live in <code className="t-mono">src/app/globals.css</code>, components in{" "}
          <code className="t-mono">src/design/</code>. Brand geometry is generated from{" "}
          <code className="t-mono">design/bacon-source.svg</code> by{" "}
          <code className="t-mono">npm run brand</code>.
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card title="Brand">
          <div className="flex flex-wrap items-center gap-8 py-5">
            <BaconLockup height={40} />
            <BaconMark size={40} />
            <BaconAppIcon size={56} />
            <BaconAppIcon size={56} shape="circle" />
          </div>
        </Card>

        <Card title="Color">
          <ul className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3">
            {SWATCHES.map(([token, use]) => (
              <li key={token} className="flex items-center gap-2.5">
                <span
                  className="h-8 w-8 shrink-0 rounded-sm border border-line"
                  style={{ background: `var(--${token})` }}
                />
                <span className="min-w-0">
                  <span className="t-mono block text-ink">--{token}</span>
                  <span className="t-meta block truncate">{use}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Type">
          <div className="flex flex-col gap-3 py-4">
            <p className="t-display">Display, one per view</p>
            <p className="t-heading">Heading for cards and sections</p>
            <p className="t-row">Row title, a task written as a sentence</p>
            <p>Body copy at reading size for task descriptions and comments.</p>
            <p className="t-meta">Meta, for who did what and when</p>
            <p className="t-label">Section label</p>
            <p className="t-mono">BCN-42 · 2026-10-12T14:20Z · bcn_live_…</p>
          </div>
        </Card>

        <Card title="Buttons">
          <div className="flex flex-wrap items-center gap-2 py-4">
            <Button variant="primary">Create task</Button>
            <Button>Claim</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Reject</Button>
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </Card>

        <Card title="Fields">
          <div className="grid gap-3 py-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="demo-title">Title</FieldLabel>
              <Input id="demo-title" placeholder="What needs doing?" />
            </div>
            <div>
              <FieldLabel htmlFor="demo-space">Space</FieldLabel>
              <Select id="demo-space" defaultValue="projects">
                <option value="projects">Projects</option>
                <option value="work">Work</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="demo-body">Details</FieldLabel>
              <Textarea id="demo-body" placeholder="Context, links, acceptance criteria" />
            </div>
          </div>
        </Card>

        <Card title="Badges">
          <div className="flex flex-col gap-3 py-4">
            <div className="flex flex-wrap gap-2">
              {TASK_STATUSES.map((s) => (
                <StatusBadge key={s} status={s} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <PriorityBadge key={p} priority={p} />
              ))}
              <Badge tone="approval">needs approval</Badge>
            </div>
          </div>
        </Card>

        <Card title="Task rows" count={3}>
          <div className="py-1">
            <a href="#" className="task-row">
              <span className="ref">BCN-42</span>
              <span className="t-row min-w-0 flex-1 truncate">
                Wire the MCP endpoint to the service layer
              </span>
              <StatusBadge status="in-progress" />
            </a>
            <a href="#" className="task-row">
              <span className="ref">BCN-41</span>
              <span className="t-row min-w-0 flex-1 truncate">Reply to the SCD venue about dates</span>
              <StatusBadge status="waiting" />
            </a>
            <a href="#" className="task-row">
              <span className="ref">BCN-40</span>
              <span className="t-row min-w-0 flex-1 truncate">Request: review my talk abstract</span>
              <StatusBadge status="inbox" />
            </a>
          </div>
        </Card>

        <Card title="Tabs and avatars">
          <div className="flex flex-col gap-4 py-4">
            <Tabs
              label="Demo"
              current="/design"
              items={[
                { href: "/design", label: "Open" },
                { href: "/design?t=mine", label: "Mine" },
                { href: "/design?t=done", label: "Done" },
              ]}
            />
            <div className="flex items-center gap-2">
              <Avatar name="Gabriel" kind="owner" />
              <Avatar name="Ithaca" kind="agent" />
              <Avatar name="Ana Requester" kind="requester" />
            </div>
          </div>
        </Card>

        <Card title="Timeline">
          <ol className="timeline py-4">
            <TimelineItem actor="Ithaca" kind="agent" verb="claimed this" at="2026-10-12T14:02:00Z" />
            <TimelineItem
              actor="Ithaca"
              kind="agent"
              verb="logged progress"
              at="2026-10-12T14:20:00Z"
            >
              <p className="prose">Service layer done, tests green. Starting the MCP route.</p>
            </TimelineItem>
            <TimelineItem actor="Gabriel" kind="owner" verb="commented" at="2026-10-12T15:00:00Z">
              <p className="prose">Ship it behind the bearer check first.</p>
            </TimelineItem>
          </ol>
        </Card>

        <Card title="Empty state">
          <EmptyState title="Inbox zero">
            New requests from requesters and agents land here for triage.
          </EmptyState>
        </Card>
      </div>
    </main>
  );
}
