# Changes Summary — Milestone 2 Round 3 Remediations

**Worker**: `worker_m2_gen3`  
**Date**: 2026-10-14  
**Package**: `@repo/ui` (`packages/ui`)

---

## 1. Overview of Changes

This remediation addresses three core architectural and accessibility issues discovered in Milestone 2:
1. **Form Controls Prop Precedence & ARIA Linkage**:
   In `Input`, `Textarea`, and `Select`, `{...props}` was positioned after `aria-describedby` and `aria-invalid`, causing caller-provided `aria-describedby` (such as helper hints or field descriptions) to overwrite the component-derived combination of caller hint + validation error ID (`${callerDescribedBy} ${errorId}`). Moving `{...props}` to the beginning of the JSX element guarantees that internal derived attributes (`id`, `ref`, `className`, `aria-invalid`, `aria-describedby`) maintain authoritative precedence while all caller attributes (`placeholder`, `disabled`, `value`, `onChange`, `data-*`) are safely preserved.
2. **Tooltip SSR & Accessibility Architecture**:
   In `Tooltip`, the component previously relied solely on internal uncontrolled hover/focus state initialized to `false`, omitting the popup markup during SSR (`renderToString`). We added `open?: boolean`, `defaultOpen?: boolean`, `onOpenChange?: (open: boolean) => void`, and `forceMount?: boolean`. We also introduced deterministic/auto-generated `tooltipId` via `React.useId()`, trigger child cloning with `aria-describedby` linkage, Escape key dismissal per W3C WAI-ARIA APG Tooltip specifications, and `data-state` / `data-side` attributes.
3. **TabsContent SSR Persistence & `forceMount` Support**:
   In `Tabs` and `TabsContent`, inactive tab panels previously executed `if (!isSelected) return null;` unconditionally, unmounting from the DOM during SSR and preventing crawlers or persistent workflows from accessing tab content. We introduced `forceMount?: boolean` on `TabsProps` (cascading via `TabsContext`) and `TabsContentProps` (with default `false` to guarantee 100% backward compatibility). When `forceMount={true}` or explicit `hidden` is passed, inactive panels remain mounted in the DOM with `role="tabpanel"`, `data-state="inactive"`, `hidden={true}`, and `className="... hidden"`.

---

## 2. File-by-File Details

### 2.1 `packages/ui/src/components/input.tsx`
- **Change**: Moved `{...props}` to the first attribute on `<input>` before `ref`, `type`, `id`, `className`, `aria-invalid`, and `aria-describedby`.
- **Rationale**: Prevents raw caller `aria-describedby` and `aria-invalid` from clobbering the compound `aria-describedby` string linking caller hint + error alert ID.

### 2.2 `packages/ui/src/components/textarea.tsx`
- **Change**: Moved `{...props}` to the first attribute on `<textarea>` before `ref`, `id`, `className`, `aria-invalid`, and `aria-describedby`.
- **Rationale**: Ensures caller description IDs are retained and combined with `${textareaId}-error`.

### 2.3 `packages/ui/src/components/select.tsx`
- **Change**: Moved `{...props}` to the first attribute on `<select>` before `ref`, `id`, `disabled`, `aria-invalid`, `aria-describedby`, and `className`.
- **Rationale**: Ensures caller description IDs are retained and combined with `${selectId}-error`.

### 2.4 `packages/ui/src/components/tooltip.tsx`
- **Change**:
  - Added props: `open?: boolean`, `defaultOpen?: boolean`, `onOpenChange?: (open: boolean) => void`, `forceMount?: boolean`, `id?: string`.
  - Added deterministic `tooltipId = id || React.useId()`.
  - Added `useEffect` keydown listener dismissing tooltip on `Escape` key press.
  - Added trigger child clone via `React.cloneElement` attaching `aria-describedby={describedBy}` when `content` exists and tooltip is open or force-mounted.
  - Added `data-state={isOpen ? "open" : "closed"}` and `data-side={side}` to tooltip popup container.
  - When `forceMount={true}` and tooltip is not open, mounts `<div role="tooltip" ... hidden className="... hidden">`.
  - Enhanced `TooltipContent` with `React.forwardRef` and `data-side` / `sideClasses[side]`.
- **Rationale**: Meets W3C WAI-ARIA APG Tooltip specifications, enables SSR static inspection via `defaultOpen` or `forceMount`, and supports controlled/uncontrolled usage.

### 2.5 `packages/ui/src/components/tabs.tsx`
- **Change**:
  - Added `forceMount?: boolean` to `TabsContextValue`, `TabsProps`, and `TabsContentProps`.
  - `Tabs` provider passes `forceMount` to all child components via `TabsContext`.
  - Default `forceMount = false` preserves backward compatibility with lazy mounting.
  - In `TabsContent`: if `!isSelected && !forceMount && !isHiddenProvided`, returns `null`.
  - When `forceMount={true}` or `propHidden !== undefined`, mounts panel with `data-state={isSelected ? "active" : "inactive"}`, `hidden={!isSelected ? true : propHidden}`, and `className={cn("...", !isSelected && "hidden")}`.
  - Spreads `{...props}` before `data-state` and `hidden` so caller props do not clobber internal visibility state.
- **Rationale**: Allows SEO indexing, SSR markup retention, and animation support for inactive tabs while maintaining 100% backward compatibility with lazy-mounted tab expectations.

### 2.6 `tests/unit/components.test.ts`
- **Change**: Added 8 comprehensive unit tests:
  - Input: Preserves caller `aria-describedby` and appends `errorId` when error text is provided.
  - Textarea: Preserves caller `aria-describedby` and appends `errorId` when error text is provided.
  - Select: Preserves caller `aria-describedby` and appends `errorId` when error text is provided.
  - Tabs: Unmounts inactive panels by default (`forceMount=false`).
  - Tabs: `forceMount={true}` on TabsContent mounts inactive panel with `hidden` and `data-state="inactive"`.
  - Tabs: `forceMount={true}` on Tabs root cascades to child TabsContent panels.
  - Tabs: Explicit `hidden` attribute mounts unselected panel.
  - Tooltip: Renders popup content in SSR markup when `defaultOpen={true}` with `data-state="open"` and `aria-describedby`.
  - Tooltip: Renders hidden popup content in SSR markup when `forceMount={true}` with `data-state="closed"` and `hidden`.

---

## 3. Verification Commands & Results

| # | Command | Result | Details |
|---|---|---|---|
| 1 | `./node_modules/.bin/tsc --noEmit -p packages/ui/tsconfig.json` | **PASS** | Zero TypeScript diagnostic errors in `@repo/ui` |
| 2 | `./node_modules/.bin/biome check packages/ui/src tests/unit/components.test.ts` | **PASS** | 26 files checked, 0 errors, clean formatting |
| 3 | `./node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json && ./node_modules/.bin/tsc --noEmit -p apps/console/tsconfig.json && ./node_modules/.bin/tsc --noEmit -p apps/admin/tsconfig.json` | **PASS** | Zero type errors across `apps/web`, `apps/console`, and `apps/admin` |
| 4 | `bun test tests/unit/components.test.ts` | **PASS** | 38/38 unit tests passed |
| 5 | `bun test tests/adversarial-components-challenge.test.ts` | **PASS** | 22/22 adversarial component tests passed |
| 6 | `bun test tests/e2e/challenger-m2-empirical.test.ts` | **PASS** | 50/50 empirical stress tests passed |
| 7 | `bun test tests/` | **PASS** | 206/206 tests passed across 10 files |
| 8 | `bun tests/e2e/run-all.ts` | **PASS** | 62/62 tests passed across Tiers 1–4 (100% pass rate) |
