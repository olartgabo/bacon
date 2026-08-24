import Link from "next/link";
import { notFound } from "next/navigation";
import { SPACES } from "@/lib/spaces";
import { Frame } from "@/components/Frame";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Reveal } from "@/components/Reveal";

export const dynamic = "force-dynamic";

export default async function SpacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const index = SPACES.findIndex((s) => s.slug === slug);
  if (index === -1) notFound();
  const space = SPACES[index];

  return (
    <>
      <Frame />
      <Reveal>
        <main className="mx-auto max-w-[90rem] px-[var(--frame)] pt-10 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-10">
          <header className="sheet-grid mb-10 border-b border-object pb-5">
            <div className="reveal col-span-12 md:col-span-7">
              <Link
                href="/"
                className="t-label-sm text-red transition-colors hover:text-ink"
              >
                ← Sheet 01
              </Link>
              <h1 className="t-display mt-1.5 text-ink">{space.label}</h1>
            </div>
            <div className="reveal col-span-12 mt-4 flex items-end justify-between gap-4 md:col-span-5 md:mt-0">
              <dl className="grid grid-cols-2 gap-x-5">
                <div>
                  <dt className="t-label-sm text-ink-faint">Space</dt>
                  <dd className="t-row tnum mt-0.5 text-ink-dim">
                    {String(index + 1).padStart(2, "0")} / {SPACES.length}
                  </dd>
                </div>
                <div>
                  <dt className="t-label-sm text-ink-faint">Source</dt>
                  <dd className="t-row mt-0.5 text-ink-dim">read-only</dd>
                </div>
              </dl>
              <ThemeToggle />
            </div>
          </header>

          <div className="sheet-grid">
            <section className="panel reveal col-span-12 lg:col-span-8">
              <header className="panel-header">
                <span className="t-label text-ink">{space.note}</span>
                <span className="t-label-sm text-ink-faint">stage 2</span>
              </header>
              <div className="px-4 py-6">
                <p className="t-label-sm text-ink-faint">not populated yet</p>
                <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-ink-dim">
                  Per-domain context — overview, open loops, decisions,
                  deadlines — is stage-2 work in{" "}
                  <code className="font-mono text-[0.78em] text-ink-faint">
                    docs/web-dashboard-stack.md
                  </code>
                  . This domain has no tagged content yet. Tasks and decisions
                  are still visible, untagged, on{" "}
                  <Link
                    href="/"
                    className="text-red underline decoration-1 underline-offset-2"
                  >
                    Sheet 01
                  </Link>
                  .
                </p>
              </div>
            </section>
          </div>
        </main>
      </Reveal>
    </>
  );
}
