"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as Theme) ?? "dark");
  }, []);

  if (!theme) {
    return <span className="theme-toggle t-label-sm inline-block w-[4.5rem]" aria-hidden />;
  }

  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="theme-toggle t-label-sm"
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
      aria-label={`Switch to ${next} mode`}
    >
      {theme === "dark" ? "◐ light" : "◑ dark"}
    </button>
  );
}
