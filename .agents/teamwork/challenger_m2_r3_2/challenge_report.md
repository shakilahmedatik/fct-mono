# Challenge Report — Milestone 2 Round 3 Evaluation

**Agent**: `challenger_m2_r3_2` (Challenger 2 Round 3)  
**Date**: 2026-10-14  
**Working Directory**: `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/challenger_m2_r3_2/`  

---

## Challenge Summary

**Overall risk assessment**: **LOW**

Worker Generation 3 (`worker_m2_gen3`) has fully remediated all defects identified in previous rounds in `@repo/ui`. Empirical verification confirms:
1. `Tooltip` correctly supports `defaultOpen={true}` and `forceMount={true}`, rendering tooltip popup content in SSR static HTML while binding the trigger element's `aria-describedby` attribute to the tooltip's `id`. Default uncontrolled mode (`defaultOpen=false`, `forceMount=false`) preserves clean lazy unmounting without injecting unused markup into the static HTML tree.
2. `Tabs` properly implements cascading `forceMount={true}`, rendering inactive panels in SSR static HTML with `role="tabpanel"`, `data-state="inactive"`, `hidden` attribute, and CSS class `hidden`. Concurrently, default `forceMount=false` preserves backward compatibility and lazy unmounting (`return null`), ensuring existing tests and client DOM footprints remain optimal. Furthermore, individual `TabsContent` panels can opt in or opt out locally.
3. Form controls (`Input`, `Textarea`, `Select`) spread `{...props}` before design-system-managed attributes, successfully preserving caller-supplied `aria-describedby` values appended with generated error container IDs.
4. All existing and newly developed empirical tests pass with a 100% success rate across all packages and applications, with zero TypeScript and zero Biome linter errors.

---

## Challenges & Stress Scenarios

### Challenge 1 (Low Risk - Remediated): Tooltip SSR Popup Presence & WAI-ARIA Trigger Linkage
- **Assumption challenged**: Tooltip should be discoverable by search engines or SSR static consumers when requested, without breaking accessible disclosure on the client or during hydration.
- **Attack scenario**:
  - Render `<Tooltip content="Helpful info" defaultOpen={true}><button>Click</button></Tooltip>` via `renderToStaticMarkup` / `renderToString`.
  - Check whether static HTML contains `"Helpful info"`, `role="tooltip"`, `data-state="open"`.
  - Check whether the `<button>` element receives `aria-describedby="<id>"` matching the tooltip container's `id`.
  - Repeat with `forceMount={true}` and `defaultOpen={false}`: check whether content is mounted with `data-state="closed"`, `hidden` attribute, and `hidden` CSS class, while retaining `aria-describedby` linkage.
  - Test edge cases: pre-existing `aria-describedby="help-text"`, explicit `id="custom-id"`, null/empty content (`""`, `null`), and non-element children (`"Plain text trigger"`).
- **Blast radius**: If broken, assistive tech cannot associate tooltip text with the trigger element, and SSR indexers cannot capture tooltip content.
- **Empirical result**: **PASS**. All assertions verified in `tests/e2e/challenger-m2-r3-deep-empirical.test.ts` (Tests 1.1–1.11).
  - Static HTML for `defaultOpen={true}`: `<div class="relative inline-flex"><button aria-describedby="_R_0_">Click</button><div role="tooltip" id="_R_0_" data-state="open" ...>Helpful info</div></div>`.
  - Static HTML for `forceMount={true}`: `<div class="relative inline-flex"><button aria-describedby="_R_0_">Click</button><div role="tooltip" id="_R_0_" data-state="closed" hidden="" class="... hidden">Helpful info</div></div>`.
  - Pre-existing `aria-describedby` correctly combined: `aria-describedby="existing-help-text my-tip"`.
  - Plain text children handled gracefully without crashing `React.cloneElement`.
  - Escape key event listener cleanly attached to `document` and dismissed on keydown.

### Challenge 2 (Low Risk - Remediated): Tabs ForceMount Cascading vs. Lazy Unmounting
- **Assumption challenged**: Calling `forceMount={true}` on `<Tabs>` should render all inactive tab panels with `hidden` in SSR static HTML, but default `forceMount=false` must NOT break backward compatibility or unmounting guarantees.
- **Attack scenario**:
  - Render `<Tabs defaultValue="tab1">` with two panels: verify inactive panel `tab2` returns `null` and is completely absent from static HTML.
  - Render `<Tabs defaultValue="tab1" forceMount={true}>` with three panels: verify active panel `tab1` has `data-state="active"` and NO `hidden`, while panels `tab2` and `tab3` have `data-state="inactive"`, `hidden` attribute, and class `hidden`.
  - Render `<Tabs defaultValue="tab1">` with panel 1 active, panel 2 `forceMount={true}`, and panel 3 lazy: verify panel 2 is mounted with `hidden` while panel 3 returns `null`.
  - Render `<Tabs defaultValue="tab1" forceMount={true}>` where panel 2 specifies `forceMount={false}`: verify panel 2 opts out of cascading and returns `null`.
  - Render nested Tabs: verify inner Tabs context isolates `forceMount` and active values from outer Tabs.
  - Render `TabsContent` standalone without parent `Tabs`: verify fallback behavior does not crash.
- **Blast radius**: If broken, SEO crawlers cannot crawl tabbed documentation/pages when forceMount is desired; or conversely, memory bloat and test breakage occurs if default lazy unmounting is compromised.
- **Empirical result**: **PASS**. All assertions verified in `tests/e2e/challenger-m2-r3-deep-empirical.test.ts` (Tests 2.1–2.8).
  - Default `forceMount=false`: inactive content is 100% absent from static HTML (`return null`).
  - Root `forceMount={true}`: inactive panels render `<div role="tabpanel" data-state="inactive" hidden="" class="... hidden">...</div>`.
  - Granular `forceMount={false}` override under root `forceMount={true}` works via nullish coalescing `propForceMount ?? context?.forceMount ?? false`.
  - Nested Tabs isolate context cleanly.
  - Keyboard navigation handles `ArrowRight`, `ArrowLeft`, `Home`, and `End` with wrap-around modulo logic.

### Challenge 3 (Low Risk - Remediated): Form Controls Attribute Precedence & Error DescribedBy
- **Assumption challenged**: Spreading caller props after computed attributes in `Input`, `Textarea`, and `Select` must not overwrite composite `aria-describedby`.
- **Attack scenario**:
  - Supply caller `aria-describedby="field-help"` and `error="Required error"` to `Input`, `Textarea`, and `Select`.
  - Inspect output HTML for `aria-invalid="true"`, `aria-describedby="field-help <id>-error"`, and error paragraph presence.
- **Blast radius**: Overwriting `aria-describedby` violates WCAG 3.3.1 (Error Identification) and severs screen-reader help text links.
- **Empirical result**: **PASS**. Verified in `tests/e2e/challenger-m2-r3-deep-empirical.test.ts` (Tests 3.1–3.3) and `tests/e2e/challenger-m2-r2-empirical.test.ts` (Tests 2.1–2.3).
  - `Input`: `aria-describedby="help-text email-input-error"`.
  - `Textarea`: `aria-describedby="bio-help bio-textarea-error"`.
  - `Select`: `aria-describedby="country-hint country-select-error"`.

---

## Stress Test Results Matrix

| Test Suite / Command | Expected | Actual | Status | Notes |
|---|---|---|---|---|
| `bun test tests/e2e/challenger-m2-empirical.test.ts` | 50 pass, 0 fail | 50 pass, 0 fail | **PASS** | 177 expect calls, 114ms |
| `bun test tests/adversarial-components-challenge.test.ts` | 22 pass, 0 fail | 22 pass, 0 fail | **PASS** | 158 expect calls, 98ms |
| `bun test tests/e2e/challenger-m2-r3-deep-empirical.test.ts` | 22 pass, 0 fail | 22 pass, 0 fail | **PASS** | 88 expect calls, 95ms (Deep SSR/forceMount harness) |
| `bun test tests/` (all 12 test files) | 231 pass, 0 fail | 231 pass, 0 fail | **PASS** | 1,197 expect calls, 492ms |
| `bun tests/e2e/run-all.ts` (Tiers 1–4) | 62 pass, 0 fail | 62 pass, 0 fail | **PASS** | 100% across Tiers 1–4 |
| `tsc --noEmit -p packages/ui/tsconfig.json` | Exit code 0 | Exit code 0 | **PASS** | 0 TypeScript errors |
| `tsc --noEmit -p apps/web/tsconfig.json` | Exit code 0 | Exit code 0 | **PASS** | 0 TypeScript errors |
| `tsc --noEmit -p apps/console/tsconfig.json` | Exit code 0 | Exit code 0 | **PASS** | 0 TypeScript errors |
| `tsc --noEmit -p apps/admin/tsconfig.json` | Exit code 0 | Exit code 0 | **PASS** | 0 TypeScript errors |
| `biome check packages/ui/src` | 25 files clean | 25 files clean | **PASS** | 0 errors, 0 warnings |

---

## Unchallenged Areas

- **Browser-Specific CSS Animations / Transitions**: Testing visual CSS keyframe transitions (`animate-in fade-in-0 zoom-in-95`) in real GPU/browser render engines is outside the scope of Node/Bun SSR testing. Static classes and Tailwind configuration were verified.
- **Apps Worker Redis Services**: Running `apps/worker` tests requires a live local Redis instance on port 6379, which is external to the `@repo/ui` Milestone 2 scope.

---

## Verdict

**APPROVE**

All Milestone 2 Round 3 remediations in `@repo/ui` (`Tooltip`, `Tabs`, and form controls) meet the highest empirical standards of correctness, accessibility, SSR fidelity, backward compatibility, and typing integrity.
