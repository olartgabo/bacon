"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/actions";

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Wraps a server action: shows its error or success message, and a
 * freshly minted token exactly once. `resetOnSuccess` clears inputs after
 * posting a comment or creating something, but not after editing fields.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (prev: ActionState, fd: FormData) => {
    const next = await action(prev, fd);
    if (resetOnSuccess && !next.error) formRef.current?.reset();
    return next;
  }, {});

  return (
    <form ref={formRef} action={formAction} className={className}>
      {children}
      {state.error && (
        <p role="alert" className="t-meta mt-2 text-brand-ink">
          {state.error}
        </p>
      )}
      {state.ok && !state.error && (
        <p role="status" className="t-meta mt-2">
          {state.ok}
        </p>
      )}
      {state.token && (
        <div className="mt-3 rounded-md border border-line bg-well p-3">
          <p className="t-meta">Copy this token now. It is not shown again.</p>
          <code className="t-mono mt-1 block break-all text-ink select-all">{state.token}</code>
        </div>
      )}
    </form>
  );
}

/** Disabled while its form is submitting so a double click posts once. */
export function Submit({
  children,
  variant = "primary",
  name,
  value,
  size = "md",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  name?: string;
  value?: string;
  size?: "sm" | "md";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={`btn btn-${variant}${size === "sm" ? " btn-sm" : ""}`}
    >
      {children}
    </button>
  );
}
