import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { BaconAppIcon } from "./brand";
import {
  STATUS_LABEL,
  type IdentityKind,
  type Priority,
  type TaskStatus,
} from "@/lib/bacon/model";

const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const btn = (variant: Variant, size: Size, className?: string) =>
  cx("btn", `btn-${variant}`, size === "sm" && "btn-sm", className);

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={btn(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={btn(variant, size, className)} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx("field", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx("field", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <span className={cx("select-shell", className)}>
      <select className="field" {...props} />
    </span>
  );
}

export function FieldLabel(props: ComponentProps<"label">) {
  return <label className="field-label" {...props} />;
}

export function Card({
  title,
  count,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("card", className)}>
      {(title || action) && (
        <header className="card-header">
          <h2 className="t-heading flex items-center gap-2">
            {title}
            {count !== undefined && <span className="count">{count}</span>}
          </h2>
          {action}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className="badge badge-dot" data-status={status}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className="badge" data-priority={priority}>
      {priority}
    </span>
  );
}

export function Badge({
  tone,
  children,
}: {
  tone?: "approval";
  children: ReactNode;
}) {
  return (
    <span className="badge" data-tone={tone}>
      {children}
    </span>
  );
}

/** Agents render as the brand avatar tile, people as initials. */
export function Avatar({ name, kind }: { name: string; kind: IdentityKind }) {
  if (kind === "agent") {
    return (
      <span className="avatar" data-kind="agent" title={name}>
        <BaconAppIcon size={28} shape="circle" />
      </span>
    );
  }
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="avatar" data-kind={kind} title={name}>
      {initials}
    </span>
  );
}

export function Tabs({
  items,
  current,
  label,
}: {
  items: { href: string; label: string }[];
  current: string;
  label: string;
}) {
  return (
    <nav className="tabs" aria-label={label}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="tab"
          aria-current={item.href === current ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <p className="t-row text-ink-dim">{title}</p>
      {children && <div className="t-meta max-w-[42ch]">{children}</div>}
    </div>
  );
}

export function TimelineItem({
  actor,
  kind,
  verb,
  at,
  children,
}: {
  actor: string;
  kind: IdentityKind;
  verb: ReactNode;
  at: string;
  children?: ReactNode;
}) {
  return (
    <li className="timeline-item">
      <Avatar name={actor} kind={kind} />
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="t-meta">
          <span className="font-semibold text-ink">{actor}</span> {verb}{" "}
          <time dateTime={at} className="t-mono">
            {formatWhen(at)}
          </time>
        </p>
        {children && <div className="mt-1.5">{children}</div>}
      </div>
    </li>
  );
}

const WHEN = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

/** Rendered on the server, so it is pinned to UTC instead of a timezone
 * that would differ between the host and the viewer. */
export function formatWhen(iso: string): string {
  return `${WHEN.format(new Date(iso))} UTC`;
}
