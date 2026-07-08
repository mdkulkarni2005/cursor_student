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

function getInitialTheme(): { theme: Theme; resolved: "light" | "dark" } {
  if (typeof window === "undefined") return { theme: "system", resolved: "light" };
  const stored = localStorage.getItem("vidyos-recruiter-theme") as Theme | null;
  const theme = stored || "system";
  const resolved = theme === "system" ? getSystemTheme() : theme;
  return { theme, resolved };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(getInitialTheme);

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
    localStorage.setItem("vidyos-recruiter-theme", t);
  }

  return (
    <ThemeContext.Provider value={{ theme: state.theme, setTheme, resolved: state.resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}
