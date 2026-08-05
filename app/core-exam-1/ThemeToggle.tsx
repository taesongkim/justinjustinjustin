"use client";

import { useEffect, useState } from "react";

// Tiny light/dark switcher for the header. Default is light; the choice is
// persisted to localStorage and applied to <html data-theme> (a no-flash inline
// script in layout.tsx sets it before paint on subsequent loads).
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("ce-theme", next);
    } catch {
      // ignore storage failures (private mode etc.)
    }
  };

  const goingDark = theme === "light";
  return (
    <button
      aria-label={goingDark ? "Switch to dark mode" : "Switch to light mode"}
      className="ce-theme-toggle"
      onClick={toggle}
      title={goingDark ? "Dark mode" : "Light mode"}
      type="button"
    >
      {goingDark ? (
        // moon — clicking goes dark
        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
          <path
            d="M13.2 9.6A5.2 5.2 0 0 1 6.4 2.8a5.4 5.4 0 1 0 6.8 6.8Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.4"
          />
        </svg>
      ) : (
        // sun — clicking goes light
        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
          <circle
            cx="8"
            cy="8"
            fill="none"
            r="3.1"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.2 3.2l1.15 1.15M11.65 11.65l1.15 1.15M12.8 3.2l-1.15 1.15M4.35 11.65 3.2 12.8"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.4"
          />
        </svg>
      )}
      {/* Label only shows when this button sits inside the mobile menu; the
          header keeps it icon-only via CSS. */}
      <span className="ce-theme-toggle-label">
        {goingDark ? "Dark mode" : "Light mode"}
      </span>
    </button>
  );
}
