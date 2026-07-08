"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const storageKey = "decantscba-theme";
const themeEvent = "decantscba-theme-change";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(storageKey);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(storageKey, theme);
  window.dispatchEvent(new Event(themeEvent));
}

function getThemeSnapshot(): Theme {
  if (typeof document === "undefined") return "light";
  const htmlTheme = document.documentElement.dataset.theme;
  if (htmlTheme === "light" || htmlTheme === "dark") return htmlTheme;
  return getPreferredTheme();
}

function subscribeToTheme(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const syncSystemTheme = () => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored !== "light" && stored !== "dark") {
      document.documentElement.dataset.theme = media.matches ? "dark" : "light";
      callback();
    }
  };

  window.addEventListener(themeEvent, callback);
  window.addEventListener("storage", callback);
  media.addEventListener("change", syncSystemTheme);

  return () => {
    window.removeEventListener(themeEvent, callback);
    window.removeEventListener("storage", callback);
    media.removeEventListener("change", syncSystemTheme);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => "light");

  function toggleTheme() {
    applyTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      data-theme-state={theme}
      aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
      aria-pressed={theme === "dark"}
      onClick={toggleTheme}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        <Sun size={15} />
      </span>
      <span className="theme-toggle-icon" aria-hidden="true">
        <Moon size={15} />
      </span>
      <span className="theme-toggle-knob" aria-hidden="true">
        {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
      </span>
    </button>
  );
}
