import Link from "next/link";
import { notFound } from "next/navigation";
import { SPACES } from "@/lib/spaces";
import { Frame } from "@/components/Frame";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function SpacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const space = SPACES.find((s) => s.slug === slug);
  if (!space) notFound();

  return (
    <>
      <Frame />
      <main className="mx-auto max-w-[90rem] px-[var(--frame)] py-10">
        <div className="sheet-grid mb-8 items-baseline border-b border-object pb-4">
          <div className="col-span-8 flex items-baseline gap-4">
            <Link href="/" className="t-label text-red hover:underline">
              ← SHEET 01
            </Link>
            <span className="t-label text-ink-faint">
              spaces / {space.slug}
            </span>
          </div>
          <div className="col-span-4 flex items-center justify-end gap-4">
            <span className="t-label text-ink-faint">read-only · olympus</span>
            <ThemeToggle />
          </div>
        </div>

        <div className="sheet-grid">
          <div className="col-span-12 border border-object md:col-span-8">
            <header className="border-b border-object px-4 py-2">
              <span className="t-label-sm text-ink-faint/70">
                {space.label}
              </span>
            </header>
            <div className="px-4 py-6">
              <p className="t-label text-ink-dim">not populated yet</p>
              <p className="mt-2 max-w-[55ch] text-sm text-ink-faint">
                Per-domain context (overview, open loops, decisions,
                deadlines) is stage-2 work in{" "}
                <code className="t-label-sm">
                  docs/web-dashboard-stack.md
                </code>{" "}
                — this domain doesn&apos;t have tagged content yet. Tasks and
                decisions are still visible, untagged, on{" "}
                <Link href="/" className="text-red hover:underline">
                  Sheet 01
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
