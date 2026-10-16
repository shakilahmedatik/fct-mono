/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
"use client";

import { Check, Laptop, Moon, Sun } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";
import { type Theme, useTheme } from "./use-theme";

export interface ThemeToggleProps {
  className?: string;
  variant?: "dropdown" | "cycle" | "segmented";
  align?: "start" | "end";
}

const themeOptions: {
  value: Theme;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
];

export function ThemeToggle({
  className,
  variant = "dropdown",
  align = "end",
}: ThemeToggleProps): React.JSX.Element {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Handle outside click to close dropdown
  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  // Handle global escape key
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // If not mounted yet (SSR), render accessible placeholder
  if (!mounted) {
    return (
      <div
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground",
          className,
        )}
        aria-hidden="true"
      >
        <Sun className="h-4 w-4 opacity-50" />
      </div>
    );
  }

  // Segmented control variant
  if (variant === "segmented") {
    return (
      <fieldset
        className={cn(
          "inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 text-muted-foreground",
          className,
        )}
        aria-label="Theme selection"
      >
        {themeOptions.map(({ value, label, icon: Icon }) => {
          const isSelected = theme === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setTheme(value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer select-none",
                isSelected
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "hover:text-foreground hover:bg-muted/60",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </fieldset>
    );
  }

  // Cycle variant
  if (variant === "cycle") {
    const cycleNext = () => {
      if (theme === "light") setTheme("dark");
      else if (theme === "dark") setTheme("system");
      else setTheme("light");
    };

    return (
      <button
        type="button"
        onClick={cycleNext}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer select-none",
          className,
        )}
        aria-label={`Current theme: ${theme}. Click to switch theme.`}
        title={`Theme: ${theme} (click to cycle)`}
      >
        {resolvedTheme === "dark" ? (
          <Moon className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Sun className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="sr-only">Toggle theme</span>
      </button>
    );
  }

  // Helper to open dropdown and focus designated item
  const openMenuWithFocus = (target: "first" | "last" | "selected") => {
    let targetIndex = 0;
    if (target === "last") {
      targetIndex = themeOptions.length - 1;
    } else if (target === "selected") {
      const selectedIndex = themeOptions.findIndex((opt) => opt.value === theme);
      targetIndex = selectedIndex >= 0 ? selectedIndex : 0;
    }
    setOpen(true);
    setActiveIndex(targetIndex);
    setTimeout(() => {
      itemRefs.current[targetIndex]?.focus();
    }, 0);
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenuWithFocus(open ? "selected" : "first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenuWithFocus("last");
    }
  };

  const handleItemKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        const nextIndex = (index + 1) % themeOptions.length;
        setActiveIndex(nextIndex);
        itemRefs.current[nextIndex]?.focus();
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        const prevIndex = (index - 1 + themeOptions.length) % themeOptions.length;
        setActiveIndex(prevIndex);
        itemRefs.current[prevIndex]?.focus();
        break;
      }
      case "Home": {
        event.preventDefault();
        setActiveIndex(0);
        itemRefs.current[0]?.focus();
        break;
      }
      case "End": {
        event.preventDefault();
        const lastIndex = themeOptions.length - 1;
        setActiveIndex(lastIndex);
        itemRefs.current[lastIndex]?.focus();
        break;
      }
      case "Escape": {
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        triggerRef.current?.focus();
        break;
      }
      case "Tab": {
        setOpen(false);
        setActiveIndex(-1);
        break;
      }
    }
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
            setActiveIndex(-1);
          } else {
            openMenuWithFocus("selected");
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? "theme-menu" : undefined}
        aria-label={`Toggle theme (currently ${theme})`}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer select-none",
          open && "bg-muted ring-2 ring-ring",
        )}
      >
        {resolvedTheme === "dark" ? (
          <Moon className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Sun className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="sr-only">Toggle theme</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          id="theme-menu"
          role="menu"
          aria-orientation="vertical"
          aria-label="Theme options"
          tabIndex={-1}
          className={cn(
            "absolute z-50 mt-1.5 w-36 origin-top rounded-lg border border-border bg-card p-1 shadow-lg backdrop-blur-md transition-all focus:outline-none",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {themeOptions.map(({ value, label, icon: Icon }, index) => {
            const isSelected = theme === value;
            return (
              <button
                key={value}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                tabIndex={activeIndex === index ? 0 : -1}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                  setActiveIndex(-1);
                  triggerRef.current?.focus();
                }}
                onKeyDown={(e) => handleItemKeyDown(e, index)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors text-foreground cursor-pointer select-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "bg-muted font-semibold text-primary"
                    : "hover:bg-muted/70 focus:bg-muted/70",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>{label}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
