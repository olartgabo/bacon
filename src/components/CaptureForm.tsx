"use client";

import { useState, useTransition } from "react";
import { DOMAINS } from "@/lib/db/schema";

type Status = "idle" | "ok" | "error";

export function CaptureForm() {
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState<(typeof DOMAINS)[number]>("projects");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

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
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "capture failed");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="capture a task…"
          disabled={pending}
          className="t-label flex-1 border border-object bg-sheet px-3 py-2 text-ink placeholder:text-ink-faint focus-visible:border-red disabled:opacity-60"
        />
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value as (typeof DOMAINS)[number])}
          disabled={pending}
          className="t-label-sm border border-object bg-sheet px-2 text-ink-dim disabled:opacity-60"
        >
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending || title.trim().length === 0}
          className="theme-toggle t-label-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "…" : "capture"}
        </button>
      </div>
      {status !== "idle" && (
        <p
          className={`t-label-sm ${status === "error" ? "text-red" : "text-ink-faint"}`}
          role="status"
        >
          {message}
        </p>
      )}
    </form>
  );
}
