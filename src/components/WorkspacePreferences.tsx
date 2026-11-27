"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

function subscribe(update: () => void) {
  window.addEventListener("storage", update);
  window.addEventListener("openasset:preferences", update);
  return () => {
    window.removeEventListener("storage", update);
    window.removeEventListener("openasset:preferences", update);
  };
}

export function usePreference(key: string, fallback: string) {
  const value = useSyncExternalStore(subscribe, () => {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  }, () => fallback);
  return [value, (next: string) => {
    try {
      localStorage.setItem(key, next);
      window.dispatchEvent(new Event("openasset:preferences"));
    } catch { /* Browser preferences can be unavailable in private contexts. */ }
  }] as const;
}

export function WorkspaceTheme() {
  const [theme] = usePreference("openasset.theme", "dark");
  useEffect(() => {
    document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
  }, [theme]);
  return null;
}

export function ThemeToggle() {
  const [theme, setTheme] = usePreference("openasset.theme", "dark");
  const light = theme === "light";
  const label = light ? "Switch to dark theme" : "Switch to light theme";
  return <button type="button" className="button oa-icon-button" title={label} aria-label={label}
    onClick={() => setTheme(light ? "dark" : "light")}>{light ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}</button>;
}
