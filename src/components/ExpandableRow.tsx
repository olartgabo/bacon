"use client";

import { useId, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ReactMarkdown from "react-markdown";

/** The markdown bodies in olympus open with `# Title`, which the row
 * summary already shows. Rendering both put a browser-default H1 under a
 * mono label — the single ugliest thing about an opened row. */
const LEADING_H1 = /^\s*#[^\n#][^\n]*\r?\n+/;

/** A panel row whose body is worth reading in full — expands in place
 * instead of navigating away, since this dashboard has no doc viewer.
 * Height is tweened by GSAP rather than <details>, which snaps open. */
export function ExpandableRow({
  summary,
  meta,
  body,
}: {
  summary: React.ReactNode;
  meta?: React.ReactNode;
  body: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useGSAP(
    () => {
      const el = bodyRef.current;
      if (!el) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(el, { height: open ? "auto" : 0, opacity: open ? 1 : 0 });
        return;
      }

      // The closed state is the CSS default, so the tween that runs on
      // mount is a no-op — no collapse flash on first paint.
      gsap.to(el, {
        height: open ? "auto" : 0,
        opacity: open ? 1 : 0,
        duration: open ? 0.34 : 0.22,
        ease: open ? "power3.out" : "power2.in",
      });

      if (open) {
        gsap.fromTo(
          el.querySelectorAll(".prose > *"),
          { y: 6, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.3,
            ease: "power2.out",
            stagger: 0.025,
            delay: 0.06,
          },
        );
      }
    },
    { dependencies: [open], scope: rootRef },
  );

  return (
    <div ref={rootRef} className="row" data-open={open}>
      <button
        type="button"
        className="row-summary"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <Caret />
        <span className="t-row row-title min-w-0 flex-1 text-ink-dim">
          {summary}
        </span>
        {/* Statuses out of olympus are whole sentences, not tokens. Left
            to size themselves they crush the title into a three-line
            column, so the meta is capped and clipped — the full text is
            in the body one click away. */}
        {meta && (
          <span
            className="t-meta max-w-[40%] shrink-0 truncate"
            title={typeof meta === "string" ? meta : undefined}
          >
            {meta}
          </span>
        )}
      </button>
      <div id={panelId} ref={bodyRef} className="row-body" inert={!open}>
        {/* pl matches the caret column so the body hangs under the
            title, not under the tick. */}
        <div className="prose pt-1 pb-4 pl-[1.25rem]">
          <ReactMarkdown>{body.replace(LEADING_H1, "")}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

/** Rotates 90° when the row opens. */
function Caret() {
  return (
    <svg
      className="row-caret"
      viewBox="0 0 8 8"
      width="8"
      height="8"
      aria-hidden
      focusable="false"
    >
      <path d="M2 0 L7 4 L2 8 Z" fill="currentColor" />
    </svg>
  );
}
