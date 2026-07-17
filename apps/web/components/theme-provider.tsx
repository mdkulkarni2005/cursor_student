"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";
type ThemeState = { theme: Theme; resolved: "light" | "dark" };

const STORAGE_KEY = "vidyos-theme";
const THEME_CHANGE_EVENT = "vidyos-theme-change";
const SERVER_SNAPSHOT: ThemeState = { theme: "system", resolved: "light" };

let cachedSnapshot: ThemeState = SERVER_SNAPSHOT;

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: "light" | "dark";
}>({
  theme: "system",
  setTheme: () => {},
  resolved: "light",
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function computeSnapshot(): ThemeState {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  const theme = stored || "system";
  const resolved = theme === "system" ? getSystemTheme() : theme;
  return { theme, resolved };
}

// Returns a stable reference when nothing changed, as required by useSyncExternalStore
// to avoid re-render loops.
function getSnapshot(): ThemeState {
  const next = computeSnapshot();
  if (next.theme === cachedSnapshot.theme && next.resolved === cachedSnapshot.resolved) {
    return cachedSnapshot;
  }
  cachedSnapshot = next;
  return cachedSnapshot;
}

function getServerSnapshot(): ThemeState {
  return SERVER_SNAPSHOT;
}

function subscribe(callback: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => {
    mq.removeEventListener("change", callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore reads localStorage/matchMedia synchronously, matching the
  // server's deterministic snapshot on first paint and updating without an
  // effect+setState round-trip once mounted.
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.resolved === "dark");
  }, [state.resolved]);

  function setTheme(t: Theme) {
    const resolved = t === "system" ? getSystemTheme() : t;
    localStorage.setItem(STORAGE_KEY, t);
    cachedSnapshot = { theme: t, resolved };
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <ThemeContext.Provider value={{ theme: state.theme, setTheme, resolved: state.resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}
