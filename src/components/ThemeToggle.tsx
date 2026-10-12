"use client";

import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("theme", theme);
}

// The inline script in layout.tsx sets data-theme before hydration, so the
// <html> attribute is the store and this component only observes it.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function getTheme(): Theme {
  return (document.documentElement.dataset.theme as Theme) ?? "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => null);

  if (!theme) {
    return <span className="theme-toggle t-label-sm inline-block w-[4.5rem]" aria-hidden />;
  }

  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="theme-toggle t-label-sm"
      onClick={() => applyTheme(next)}
      aria-label={`Switch to ${next} mode`}
    >
      {theme === "dark" ? "◐ light" : "◑ dark"}
    </button>
  );
}
