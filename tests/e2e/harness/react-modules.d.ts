/**
 * Ambient module declarations for the workspace-local React runtime copies.
 *
 * The e2e suites import React straight out of each app's / package's
 * `node_modules` folder, because there is no hoisted `react` in the repo root
 * and the bare specifier therefore cannot be resolved at runtime. Those
 * packages ship no bundled `.d.ts` — the declarations live in `@types/react`
 * and `@types/react-dom`, which are wired up through the `paths` entries in
 * `tests/tsconfig.json`.
 *
 * These declarations attach those types to the deep runtime paths so the
 * suites typecheck without falling back to `any`.
 */

declare module "*node_modules/react" {
  import * as ReactNamespace from "react";
  export = ReactNamespace;
}

declare module "*node_modules/react-dom/server" {
  export * from "react-dom/server";
}
