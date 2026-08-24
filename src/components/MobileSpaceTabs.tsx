"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SPACES } from "@/lib/spaces";

// Spaces as a fixed-bottom folder-tab strip, mobile only — the inline
// grid (SpaceTile) is what desktop gets instead. A horizontally scrolling
// strip beats collapsing seven spaces into a cramped grid below 768px, and
// "folder tabs you fan through" is a stronger mobile metaphor than a menu.
export function MobileSpaceTabs() {
  const pathname = usePathname();

  return (
    <nav className="space-tabs" aria-label="Spaces">
      {SPACES.map((space) => {
        const href = `/spaces/${space.slug}`;
        const active = pathname === href;
        return (
          <Link
            key={space.slug}
            href={href}
            className="space-tab"
            data-active={active}
          >
            <span className="t-label-sm">{space.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
