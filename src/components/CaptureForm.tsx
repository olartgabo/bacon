"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { DOMAINS } from "@/lib/db/schema";

type Status = "idle" | "ok" | "error";

export function CaptureForm() {
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState<(typeof DOMAINS)[number]>("projects");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const titleId = useId();
  const domainId = useId();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length === 0) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/captures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, domain, source: "web" }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `request failed (${res.status})`);
        }
        setTitle("");
        setStatus("ok");
        setMessage("captured — syncs to the repo on the next sync run");
        // The Captures panel is server-rendered, so the new row only
        // appears once the route data is refetched.
        router.refresh();
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "capture failed");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={titleId} className="sr-only">
          Task title
        </label>
        <input
          id={titleId}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="capture a task…"
          disabled={pending}
          autoComplete="off"
          className="field t-row min-w-0 flex-1"
        />
        <label htmlFor={domainId} className="sr-only">
          Domain
        </label>
        <span className="select-shell">
          <select
            id={domainId}
            value={domain}
            onChange={(e) =>
              setDomain(e.target.value as (typeof DOMAINS)[number])
            }
            disabled={pending}
            className="field t-label-sm"
          >
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </span>
        <button
          type="submit"
          disabled={pending || title.trim().length === 0}
          className="theme-toggle t-label-sm shrink-0"
        >
          {pending ? "capturing…" : "capture"}
        </button>
      </div>
      <p
        className={`t-label-sm min-h-[1.4em] ${
          status === "error" ? "text-red" : "text-ink-faint"
        }`}
        role="status"
        aria-live="polite"
      >
        {status === "idle" ? "" : message}
      </p>
    </form>
  );
}
