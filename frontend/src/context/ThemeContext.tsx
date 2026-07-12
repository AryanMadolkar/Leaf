"use client";

import React, { createContext, useContext, useCallback, useState, useLayoutEffect } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_INLINE_SCRIPT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}else if(window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.setAttribute("data-theme","dark")}}catch(e){}})()`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Must start at the same value the server rendered ("light"), even though
  // the inline script may have already flipped the DOM to "dark" before
  // hydration. Reading localStorage here would make the client's first
  // render disagree with the server-rendered HTML and trigger a hydration
  // mismatch. The real value is synced in the layout effect below, which
  // runs after hydration completes.
  const [theme, setThemeState] = useState<Theme>("light");

  const applyTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  // Sync React state from whatever the inline script already put on <html>
  // (or the stored/system preference) once we're safely past hydration.
  useLayoutEffect(() => {
    let resolved: Theme = "light";
    const domTheme = document.documentElement.getAttribute("data-theme");
    if (domTheme === "light" || domTheme === "dark") {
      resolved = domTheme;
    } else {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") {
        resolved = stored;
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        resolved = "dark";
      }
    }
    setThemeState(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === "dark" ? "light" : "dark");
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
