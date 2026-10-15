"use client";

import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("theme", theme);
}

// The boot script in layout.tsx stamps a stored choice on <html> before
// hydration; with no stored choice the OS preference decides. Both are
// external to React, so this component only observes them.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

function getTheme(): Theme {
  const stored = document.documentElement.dataset.theme;
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => null);

  if (!theme) {
    return <span className="inline-block h-8 w-8" aria-hidden />;
  }

  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm h-8 w-8 !p-0"
      onClick={() => applyTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <span aria-hidden>{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
