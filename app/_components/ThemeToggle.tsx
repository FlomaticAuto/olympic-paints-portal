"use client";

import { useEffect, useState } from "react";

const THEMES = ["theme-light", "theme-dark", "theme-brand", "theme-navy"] as const;
type Theme = (typeof THEMES)[number];

const LABELS: Record<Theme, string> = {
  "theme-light": "Light",
  "theme-dark": "Dark",
  "theme-brand": "Brand",
  "theme-navy": "Navy",
};

export default function ThemeToggle() {
  const [active, setActive] = useState<Theme>("theme-light");

  useEffect(() => {
    const stored = (localStorage.getItem("oly-theme") as Theme | null) ?? null;
    const current = stored ?? (document.documentElement.className as Theme) ?? "theme-light";
    setActive(THEMES.includes(current) ? current : "theme-light");
  }, []);

  function apply(t: Theme) {
    document.documentElement.classList.remove(...THEMES);
    document.documentElement.classList.add(t);
    try {
      localStorage.setItem("oly-theme", t);
    } catch {}
    setActive(t);
  }

  return (
    <div className="theme-bar" role="group" aria-label="Theme">
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => apply(t)}
          className={active === t ? "active" : ""}
          aria-pressed={active === t}
        >
          {LABELS[t]}
        </button>
      ))}
    </div>
  );
}
