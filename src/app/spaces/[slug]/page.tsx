import Link from "next/link";
import { notFound } from "next/navigation";
import { SPACE_LABEL, SPACES, type Space } from "@/lib/bacon/model";
import { Card, EmptyState } from "@/design/ui";

export const dynamic = "force-dynamic";

export default async function SpacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SPACES.includes(slug as Space)) notFound();
  const space = slug as Space;

  return (
    <main className="shell py-10">
      <header className="mb-8">
        <Link href="/" className="t-meta hover:text-ink">
          ← Today
        </Link>
        <h1 className="t-display mt-2">{SPACE_LABEL[space]}</h1>
      </header>
      <Card title="Tasks">
        <EmptyState title="No tasks in this space yet" />
      </Card>
    </main>
  );
}
