"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; count?: number };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="nav-scroll flex min-w-0 flex-1 gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="nav-link flex shrink-0 items-center gap-1.5"
            aria-current={active ? "page" : undefined}
          >
            {item.label}
            {item.count ? <span className="count">{item.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
