import Link from "next/link";
import type { Space } from "@/lib/spaces";

export function SpaceTile({ space, index }: { space: Space; index: number }) {
  return (
    <Link href={`/spaces/${space.slug}`} className="space-tile reveal block">
      <span className="t-label-sm tnum block text-ink-faint">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="t-row mt-2 block text-ink">{space.label}</span>
      <span className="t-label-sm mt-1 block text-ink-faint">{space.note}</span>
    </Link>
  );
}
