"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

/** Draws the sheet in the order a person reads it: header rule, then
 * spaces, then the panel columns. Children opt in with className
 * "reveal" (globals.css hides those only when data-motion is on, so a
 * dead bundle or a reduced-motion visitor still gets a full page). */
export function Reveal({ children }: { children: React.ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (document.documentElement.dataset.motion !== "on") return;

      const targets = gsap.utils.toArray<HTMLElement>(".reveal");
      if (targets.length === 0) return;

      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power3.out",
        stagger: 0.045,
        startAt: { y: 10 },
      });
    },
    { scope },
  );

  return <div ref={scope}>{children}</div>;
}
