import Link from "next/link";
import { BaconLockup } from "@/design/brand";
import { listApprovals, listInbox } from "@/lib/bacon/service";
import { currentIdentity } from "@/lib/bacon/session";
import { getDb } from "@/lib/db/client";
import { NavLinks, type NavItem } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";

export async function TopBar() {
  const actor = await currentIdentity();
  let nav: NavItem[] = [];

  if (actor?.kind === "requester") {
    nav = [{ href: "/request", label: "My requests" }];
  } else if (actor) {
    const ctx = { db: getDb(), actor };
    nav = [
      { href: "/", label: "Today" },
      { href: "/tasks", label: "Tasks" },
      { href: "/inbox", label: "Inbox", count: listInbox(ctx).length },
      { href: "/approvals", label: "Approvals", count: listApprovals(ctx).length },
      { href: "/olympus", label: "Olympus" },
    ];
    if (actor.kind === "owner") nav.push({ href: "/settings", label: "Settings" });
  }

  return (
    <header className="topbar">
      <div className="shell flex h-14 items-center gap-4">
        <Link href={actor?.kind === "requester" ? "/request" : "/"} className="shrink-0 rounded-sm" aria-label="bacon home">
          <BaconLockup height={22} />
        </Link>
        <NavLinks items={nav} />
        <ThemeToggle />
      </div>
    </header>
  );
}
