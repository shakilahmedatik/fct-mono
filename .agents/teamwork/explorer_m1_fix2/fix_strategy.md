# Milestone 1 Remediation Strategy: Theme Script Hardening & SSR/Hydration Resilience

**Target**: Worker M1 (`worker_m1`)  
**Author**: Explorer 2 (`explorer_m1_fix2`)  
**Scope**: `packages/ui/src/theme/theme-script.tsx`, `packages/ui/src/theme/theme-provider.tsx`, `packages/ui/src/theme/use-theme.ts`, and root app layouts (`apps/{web,console,admin}/src/app/layout.tsx`)  
**Date**: October 14, 2026  

---

## 1. Executive Summary & Root Cause Analysis

Empirical investigations by Challenger 1 (`challenger_m1_1`) and Challenger 2 (`challenger_m1_2`) revealed three major vulnerabilities in the theme foundation layer:

1. **ThemeScript FOUC Failure on Storage `SecurityError`**:
   In `theme-script.tsx`, a single outer `try { ... } catch (_) {}` block encloses `localStorage.getItem(k)`. When storage access throws a `DOMException: SecurityError` (as occurs in Safari Private Browsing, Chrome Incognito, third-party sandboxed iframes, or when storage permissions are blocked), the script execution immediately aborts before evaluating `window.matchMedia` or setting classes on `document.documentElement`. Consequently, dark-mode users experience a glaring white flash of unstyled content (FOUC).

2. **Pre-Hydration vs Post-Hydration Divergence on Corrupt Storage**:
   In `theme-script.tsx`, `t = s || d` was used. Non-canonical strings such as `"undefined"`, `"null"`, `"NaN"`, or `"{}"` are truthy, causing `dark = t === 'dark' || (t === 'system' && m)` to evaluate to `false` and force the page into light mode. Conversely, `ThemeProvider` validates `stored === "light" || stored === "dark" || stored === "system"`, rejecting corrupt values and falling back to `defaultTheme = "system"` (which resolves to dark for dark OS users). This creates a jarring light-to-dark theme flash during React hydration.

3. **Inline `<script>` Breakout Vulnerability**:
   Raw `JSON.stringify(storageKey)` and `JSON.stringify(defaultTheme)` allow strings containing `</script>` to break out of the HTML `<script>` tag during browser parsing, terminating script execution and opening potential XSS vectors.

4. **Next.js SSR / Client Initial Hydration Asymmetry**:
   `ThemeProvider` eagerly read `localStorage` inside its `useState` initializer during client execution. On the server, `window` is `undefined`, so `theme` rendered as `defaultTheme` (`"system"`). On the client initial hydration pass, `theme` rendered as `"dark"`. Any child rendering theme-dependent markup triggers a React hydration mismatch warning. Additionally, all three app root layouts omitted `suppressHydrationWarning` on `<html lang="en">`, causing Next.js hydration warnings when `ThemeScript` mutates the `class` attribute before hydration.

---

## 2. Remediation Strategy for `packages/ui/src/theme/theme-script.tsx`

### 2.1 Technical Rationale
1. **Isolated Storage Access**: Wrapping `localStorage.getItem(k)` in a dedicated inner `try { s = localStorage.getItem(k); } catch (_) {}` ensures that even if storage access throws `SecurityError`, `s` safely defaults to `null`, allowing subsequent system theme detection and DOM class manipulation to proceed without interruption.
2. **Harmonized Validation**: Matching `(s === 'light' || s === 'dark' || s === 'system') ? s : d` ensures that corrupted or non-canonical storage values fall back to `defaultTheme` before first paint, perfectly aligning with `ThemeProvider`.
3. **Script Breakout Sanitization**: Replacing all `<` characters with `\u003c` ensures the browser HTML parser will never identify a closing `</script>` tag inside the inline script string literal, while the JavaScript engine evaluates `\u003c` back to `<`.

### 2.2 Copy-Pasteable Replacement: `packages/ui/src/theme/theme-script.tsx`

Replace the entire contents of `/Users/shakilahmedatik/Projects/firstcup-monorepo/packages/ui/src/theme/theme-script.tsx` with:

```tsx
import type * as React from "react";
import type { Theme } from "./use-theme";

export interface ThemeScriptProps {
  storageKey?: string;
  defaultTheme?: Theme;
  nonce?: string;
}

export function ThemeScript({
  storageKey = "fc-theme",
  defaultTheme = "system",
  nonce,
}: ThemeScriptProps): React.JSX.Element {
  const scriptContent = `(function(){try{var k=${JSON.stringify(storageKey).replace(/</g, "\\u003c")},d=${JSON.stringify(
    defaultTheme,
  ).replace(/</g, "\\u003c")},s=null;try{s=localStorage.getItem(k);}catch(_){}var t=(s==='light'||s==='dark'||s==='system')?s:d,m=window.matchMedia('(prefers-color-scheme: dark)').matches,dark=t==='dark'||(t==='system'&&m),r=document.documentElement;if(dark){r.classList.add('dark');r.style.colorScheme='dark';}else{r.classList.remove('dark');r.style.colorScheme='light';}}catch(_){}})();`;

  return (
    <script
      id="fc-theme-script"
      dangerouslySetInnerHTML={{ __html: scriptContent }}
      nonce={nonce}
    />
  );
}
```

---

## 3. Remediation Strategy for `ThemeProvider` & `useTheme`

### 3.1 Technical Rationale
1. **Hydration Symmetry**:
   To prevent React hydration mismatch warnings (`Hydration failed because the initial UI does not match what was rendered on the server`):
   - `theme` must initialize to `defaultTheme` so the server HTML output and the client initial render output are 100% identical.
   - Synchronizing `theme` with `localStorage` occurs strictly in `useEffect`, which fires immediately post-hydration.
2. **Exposing `mounted: boolean`**:
   Adding `mounted: boolean` to `ThemeContextValue` allows consuming components across `apps/web`, `apps/console`, and `apps/admin` (such as headers, navbars, and theme togglers) to guard theme-specific UI (e.g., rendering a placeholder or skeleton before `mounted` is `true`), completely eliminating client-server markup divergence.
3. **Zero-FOUC Retention**:
   Zero-FOUC is guaranteed because `ThemeScript` sets `.dark` and `colorScheme = 'dark'` on `document.documentElement` before the browser renders the page. Styling is applied immediately via CSS variables. When React mounts, the DOM is already dark, and `useEffect` updates the internal React state seamlessly without visual flickering.

### 3.2 Copy-Pasteable Replacement: `packages/ui/src/theme/use-theme.ts`

Replace the entire contents of `/Users/shakilahmedatik/Projects/firstcup-monorepo/packages/ui/src/theme/use-theme.ts` with:

```tsx
import * as React from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  mounted: boolean;
}

export const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
```

### 3.3 Copy-Pasteable Replacement: `packages/ui/src/theme/theme-provider.tsx`

Replace the entire contents of `/Users/shakilahmedatik/Projects/firstcup-monorepo/packages/ui/src/theme/theme-provider.tsx` with:

```tsx
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
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
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
```

---

## 4. Remediation Strategy for Consuming App Layouts

As identified by Challenger 2 (Empirical Test 3.4) and mandated by `PROJECT.md` Section 1:
- `suppressHydrationWarning` must be added to `<html lang="en">` across all three applications.
- `<ThemeScript />` must be placed in `<head>` so the inline script executes before first paint.
- Children must be wrapped in `<ThemeProvider>`.

### 4.1 Update `apps/web/src/app/layout.tsx`

In `apps/web/src/app/layout.tsx`:
1. Add import:
   ```tsx
   import { ThemeProvider, ThemeScript } from "@repo/ui";
   ```
2. Update the return statement of `RootLayout`:
   ```tsx
   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en" suppressHydrationWarning>
         <head>
           <ThemeScript defaultTheme="system" />
         </head>
         <body className="min-h-screen bg-background text-foreground antialiased flex flex-col selection:bg-accent/20 selection:text-accent">
           <ThemeProvider defaultTheme="system">
             <header className="...">...</header>
             <main className="flex-1">{children}</main>
             <footer className="...">...</footer>
           </ThemeProvider>
         </body>
       </html>
     );
   }
   ```

### 4.2 Update `apps/console/src/app/layout.tsx`

In `apps/console/src/app/layout.tsx`:
1. Add import:
   ```tsx
   import { Badge, ThemeProvider, ThemeScript } from "@repo/ui";
   ```
2. Update the return statement of `RootLayout`:
   ```tsx
   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en" suppressHydrationWarning>
         <head>
           <ThemeScript defaultTheme="system" />
         </head>
         <body className="min-h-screen bg-background text-foreground antialiased flex flex-col md:flex-row">
           <ThemeProvider defaultTheme="system">
             {/* Sidebar */}
             <aside className="...">...</aside>
             {/* Main Content Area */}
             <main className="flex-1 p-6 md:p-10 max-w-5xl overflow-y-auto">{children}</main>
           </ThemeProvider>
         </body>
       </html>
     );
   }
   ```

### 4.3 Update `apps/admin/src/app/layout.tsx`

In `apps/admin/src/app/layout.tsx`:
1. Add import:
   ```tsx
   import { Badge, ThemeProvider, ThemeScript } from "@repo/ui";
   ```
2. Update the return statement of `RootLayout`:
   ```tsx
   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en" suppressHydrationWarning>
         <head>
           <ThemeScript defaultTheme="system" />
         </head>
         <body className="min-h-screen bg-background text-foreground antialiased flex flex-col md:flex-row">
           <ThemeProvider defaultTheme="system">
             {/* Admin Sidebar */}
             <aside className="...">...</aside>
             {/* Admin Main Content */}
             <main className="flex-1 p-6 md:p-10 max-w-6xl overflow-y-auto">{children}</main>
           </ThemeProvider>
         </body>
       </html>
     );
   }
   ```

---

## 5. Test Suite Reconciliation Guidance for Worker M1

The adversarial suites (`tests/adversarial-theme-challenge.test.ts` and `tests/e2e/challenger2-empirical.test.ts`) were written by the challengers to assert the existence of bugs before the fix. Once the fixes are applied by Worker M1, several test assertions must be updated from "assert bug exists" to "assert fix verified":

### 5.1 In `tests/adversarial-theme-challenge.test.ts`
1. **Test 1.1** (`ThemeScript execution fails to set dark class when localStorage throws SecurityError`):
   - Line 102 was: `expect(hasDarkAfterScript).toBeFalse();` (verifying the bug).
   - After fix: `hasDarkAfterScript` will be `true`. Update assertion to `expect(hasDarkAfterScript).toBeTrue();`.
2. **Test 1.2** (`ThemeScript fails to apply explicit defaultTheme='dark' when localStorage throws SecurityError`):
   - Line 119 was: `expect(hasDarkAfterScript).toBeFalse();`.
   - After fix: `expect(hasDarkAfterScript).toBeTrue();`.
3. **Test 1.3** (`ThemeScript with corrupt non-standard values in localStorage forces light mode`):
   - Line 148 was: `expect(hasDarkAfterScript).toBeFalse();`.
   - After fix: When OS preference is dark and defaultTheme is system, corrupted values fall back cleanly to dark: `expect(hasDarkAfterScript).toBeTrue();`.
4. **Test 1.4** (`Pre-hydration paint vs post-hydration mismatch under corrupt storage`):
   - Line 183 was: `expect(domAfterScriptDark).toBeFalse();`.
   - After fix: `expect(domAfterScriptDark).toBeTrue();` (both pre-hydration paint and post-hydration are in dark mode, confirming zero FOUC).
5. **Test 1.5** (`Script injection resilience: raw JSON.stringify vs HTML parser tag closing`):
   - Line 198 was: `expect(containsBreakout).toBeTrue();`.
   - After fix: `containsBreakout` will be `false` because `</script>` is serialized as `\u003c/script>`. Update assertion to `expect(containsBreakout).toBeFalse();`.

### 5.2 In `tests/e2e/challenger2-empirical.test.ts`
1. **Test 3.2** (`ThemeScript single try/catch causes FOUC when localStorage throws`):
   - Line 411 was: `expect(mockDoc.documentElement.classList.addCalled).toBeFalse();`.
   - After fix: `expect(mockDoc.documentElement.classList.addCalled).toBeTrue();`.
2. **Test 3.4** (`App root layouts currently omit suppressHydrationWarning`):
   - Line 480 was: `expect(hasSuppress).toBeFalse();`.
   - After fix: `expect(hasSuppress).toBeTrue();`.

---

## 6. Independent Verification Checklist

Run the following test commands to verify complete monorepo integrity:

```bash
# 1. Verify unit tests for theme primitives
bun test tests/unit/theme.test.ts

# 2. Verify all requirement tiers (62 tests across Tiers 1-4)
bun test tests/e2e/tier*.test.ts

# 3. Verify adversarial challenge suites
bun test tests/adversarial-theme-challenge.test.ts tests/e2e/challenger2-empirical.test.ts
```
