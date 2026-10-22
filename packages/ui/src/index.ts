// Primitives & Form Controls

// Feedback & Overlays
export * from "./components/alert";
export * from "./components/badge";
export * from "./components/button";
export * from "./components/card";
export * from "./components/dialog";
// Structure & Data
export * from "./components/empty-state";
export * from "./components/input";
export * from "./components/label";
// Navigation
export * from "./components/navbar";
export * from "./components/select";
export * from "./components/sidebar";
export * from "./components/skeleton";
export * from "./components/stat-card";
export * from "./components/switch";
export * from "./components/table";
export * from "./components/tabs";
export * from "./components/textarea";
export * from "./components/tooltip";

// Utilities
export * from "./lib/utils";

// Theme
export * from "./theme/theme-provider";
export * from "./theme/theme-script";
export * from "./theme/theme-toggle";
export * from "./theme/use-theme";

/**
 * Barrel entry point.
 *
 * Every component is also importable on its own through a subpath
 * (`@repo/ui/button`, `@repo/ui/dialog`, …) so that a client bundle does not
 * have to pull the whole library in. The subpath entries live next to this
 * file as `<component>.ts` and re-export the matching module.
 *
 * The matching `package.json` change adds a wildcard export entry that maps
 * `@repo/ui/<name>` to `src/<name>.ts`, plus a `sideEffects` entry that keeps
 * `styles.css` from being tree-shaken. See the report for the exact snippet.
 */
