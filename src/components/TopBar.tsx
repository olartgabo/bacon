"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BaconLockup } from "@/design/brand";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/design", label: "Design" },
];

export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div className="shell flex h-14 items-center gap-4">
        <Link href="/" className="shrink-0 rounded-sm" aria-label="bacon home">
          <BaconLockup height={22} />
        </Link>
        <nav aria-label="Main" className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link shrink-0"
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
