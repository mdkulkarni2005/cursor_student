"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

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
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredTheme(): { theme: Theme; resolved: "light" | "dark" } {
  const stored = localStorage.getItem("vidyos-admin-theme") as Theme | null;
  const theme = stored || "system";
  const resolved = theme === "system" ? getSystemTheme() : theme;
  return { theme, resolved };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always starts matching the server's deterministic render ("light") — reading localStorage or
  // matchMedia synchronously here would mismatch the SSR HTML and trigger a hydration error. The
  // real value is applied in the effect below, which only runs client-side after mount.
  const [state, setState] = useState<{ theme: Theme; resolved: "light" | "dark" }>({ theme: "system", resolved: "light" });

  useEffect(() => {
    setState(readStoredTheme());
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.resolved === "dark");
  }, [state.resolved]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (state.theme === "system") {
        const resolved = mq.matches ? "dark" : "light";
        setState({ theme: "system", resolved });
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [state.theme]);

  function setTheme(t: Theme) {
    const resolved = t === "system" ? getSystemTheme() : t;
    setState({ theme: t, resolved });
    localStorage.setItem("vidyos-admin-theme", t);
  }

  return (
    <ThemeContext.Provider value={{ theme: state.theme, setTheme, resolved: state.resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}
