import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  createIdentityAction,
  importOlympusAction,
  revokeIdentityAction,
  rotateTokenAction,
} from "@/app/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Avatar, Card, FieldLabel, Input, Select, formatWhen } from "@/design/ui";
import { listIdentities } from "@/lib/bacon/service";
import { ownerCtx } from "@/lib/bacon/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await ownerCtx();
  const people = listIdentities(ctx);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  return (
    <main className="shell py-10">
      <header className="mb-8">
        <h1 className="t-display">Settings</h1>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title="Identities" count={people.length}>
          <ul className="py-2">
            {people.map((p) => (
              <li key={p.id} className="task-row flex-wrap">
                <Avatar name={p.name} kind={p.kind} />
                <span className="min-w-0 flex-1">
                  <span className="t-row block">
                    {p.name}
                    {p.id === ctx.actor.id && <span className="t-meta"> (you)</span>}
                  </span>
                  <span className="t-meta block">
                    {p.kind}
                    {p.email && ` · ${p.email}`}
                    {p.revokedAt ? ` · revoked ${formatWhen(p.revokedAt)}` : p.hasToken ? " · has token" : " · web only"}
                  </span>
                </span>
                {!p.revokedAt && (
                  <span className="flex gap-1">
                    <ActionForm action={rotateTokenAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <Submit variant="ghost" size="sm">
                        {p.hasToken ? "Rotate token" : "Mint token"}
                      </Submit>
                    </ActionForm>
                    {p.id !== ctx.actor.id && (
                      <ActionForm action={revokeIdentityAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <Submit variant="ghost" size="sm">
                          Revoke
                        </Submit>
                      </ActionForm>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="Add identity">
            <ActionForm action={createIdentityAction} resetOnSuccess className="flex flex-col gap-3 py-4">
              <div>
                <FieldLabel htmlFor="id-name">Name</FieldLabel>
                <Input id="id-name" name="name" placeholder="ithaca" required />
              </div>
              <div>
                <FieldLabel htmlFor="id-kind">Role</FieldLabel>
                <Select id="id-kind" name="kind" defaultValue="agent">
                  <option value="agent">Agent: full task access over MCP</option>
                  <option value="requester">Requester: files and follows own requests</option>
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="id-email">Email (for web sign-in through Cloudflare Access)</FieldLabel>
                <Input id="id-email" name="email" type="email" placeholder="optional" />
              </div>
              <div>
                <Submit>Create and mint token</Submit>
              </div>
            </ActionForm>
          </Card>

          <Card title="Connect an agent">
            <div className="py-4">
              <p className="t-meta">Claude Code, with the token minted for that device:</p>
              <pre className="t-mono mt-2 overflow-x-auto rounded-sm bg-well p-3 whitespace-pre-wrap break-all select-all">
                {`claude mcp add --transport http bacon ${origin}/api/mcp --header "Authorization: Bearer bcn_…"`}
              </pre>
            </div>
          </Card>

          <Card title="Import from olympus">
            <ActionForm action={importOlympusAction} className="py-4">
              <p className="t-meta mb-3">
                Copies olympus tasks/ and captures/ into bacon. Safe to run again: anything already imported is skipped.
              </p>
              <Submit variant="secondary">Import</Submit>
            </ActionForm>
          </Card>
        </div>
      </div>
    </main>
  );
}
