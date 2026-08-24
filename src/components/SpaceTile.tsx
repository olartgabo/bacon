import Link from "next/link";
import type { Space } from "@/lib/spaces";

export function SpaceTile({ space }: { space: Space }) {
  return (
    <Link href={`/spaces/${space.slug}`} className="space-tile block">
      <span className="t-label block text-ink">{space.label}</span>
      <span className="t-label-sm mt-1 block text-ink-faint">
        {space.note}
      </span>
    </Link>
  );
}
