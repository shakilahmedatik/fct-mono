/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
"use client";

import * as React from "react";
import { type ResolvedTheme, type Theme, ThemeContext, type ThemeContextValue } from "./use-theme";

export interface ThemeProviderProps {
  children?: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeToDOM(resolved: ResolvedTheme): void {
  if (typeof window === "undefined" || !document?.documentElement) return;
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "fc-theme",
}: ThemeProviderProps): React.JSX.Element {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored === "light" || stored === "dark" || stored === "system") {
          return stored;
        }
      } catch {
        // Storage unavailable or SecurityError
      }
    }
    return defaultTheme;
  });
  const [mounted, setMounted] = React.useState<boolean>(false);

  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>(() => {
    if (typeof window !== "undefined") {
      if (document.documentElement?.classList?.contains("dark")) {
        return "dark";
      }
      return getSystemTheme();
    }
    return defaultTheme === "dark" ? "dark" : "light";
  });

  const resolveTargetTheme = React.useCallback((targetTheme: Theme): ResolvedTheme => {
    if (targetTheme === "system") {
      return getSystemTheme();
    }
    return targetTheme;
  }, []);

  const setTheme = React.useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {
        // Ignore quota/security errors
      }
      const nextResolved = resolveTargetTheme(newTheme);
      setResolvedTheme(nextResolved);
      applyThemeToDOM(nextResolved);
    },
    [storageKey, resolveTargetTheme],
  );

  const toggleTheme = React.useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  // Initial synchronization on client mount
  React.useEffect(() => {
    setMounted(true);
    let activeTheme = defaultTheme;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "light" || stored === "dark" || stored === "system") {
        activeTheme = stored;
        setThemeState(stored);
      }
    } catch {
      // Storage unavailable or SecurityError
    }
    const nextResolved = resolveTargetTheme(activeTheme);
    setResolvedTheme(nextResolved);
    applyThemeToDOM(nextResolved);
  }, [storageKey, defaultTheme, resolveTargetTheme]);

  // Listen to cross-tab storage changes
  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const nextValue = event.newValue as Theme | null;
      const nextTheme =
        nextValue === "light" || nextValue === "dark" || nextValue === "system"
          ? nextValue
          : defaultTheme;

      setThemeState(nextTheme);
      const nextResolved = resolveTargetTheme(nextTheme);
      setResolvedTheme(nextResolved);
      applyThemeToDOM(nextResolved);
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [storageKey, defaultTheme, resolveTargetTheme]);

  // Listen to OS system color-scheme changes when theme === "system"
  React.useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const nextResolved = mediaQuery.matches ? "dark" : "light";
      setResolvedTheme(nextResolved);
      applyThemeToDOM(nextResolved);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [theme]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
      mounted,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme, mounted],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
