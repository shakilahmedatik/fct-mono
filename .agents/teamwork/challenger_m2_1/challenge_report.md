# Milestone 2 Adversarial Challenge Report: Reusable Component Suite (@repo/ui)

**Evaluator**: Challenger 1 (`challenger_m2_1`)  
**Target**: Milestone 2 (`@repo/ui` Reusable Component Suite)  
**Date**: 2026-10-14  
**Verdict**: **`REQUEST_CHANGES`**  
**Overall Risk Assessment**: **HIGH**

---

## 1. Executive Summary

Milestone 2 introduced 18 UI components into `@repo/ui`. We conducted comprehensive empirical adversarial stress testing across all components, with primary focus on Form Controls (`Input`, `Textarea`, `Label`, `Select`, `Switch`), Overlays (`Dialog`), and Navigation (`Tabs`, `Navbar`).

While baseline styling tokens, CVA variants, and TypeScript/Biome hygiene are high quality, empirical investigation revealed **two critical defects** and **two moderate accessibility/usability flaws**:
1. **Critical Defect (Claim Invalidation)**: `Dialog` has **NO focus trap** implemented, directly contradicting Worker M2's claim in `handoff.md`. Pressing `Tab` inside an open dialog leaks keyboard focus into the background page.
2. **Critical Defect (Viewport Blackout)**: `Navbar` suffers from a breakpoint mismatch between `NavbarNav` (`hidden md:flex`, 768px), `NavbarMobileToggle` (`md:hidden`, 768px), and mobile drawer (`sm:hidden`, 640px). On viewports between 640px and 767px (tablet portrait, phablets), **navigation is 100% hidden and unreachable**.
3. **Accessibility Flaw**: `Switch` label prop renders text in an unlinked `<span>` inside a `<div>` with `cursor-pointer`. The switch button lacks `aria-label` or `aria-labelledby`, and clicking the label text fails to toggle the switch.
4. **Behavioral Omission**: `Input`, `Textarea`, and `Select` accept `error?: boolean | string`, but string error messages are completely discarded and never rendered in the DOM.

Adversarial test suite `tests/adversarial-components-challenge.test.ts` (22 tests) was executed and empirically proved each finding.

---

## 2. Empirical Verification Evidence

| Area / Component | Test Case | Status | Observation / Proof |
|---|---|---|---|
| **Input** | Icon Slots (`leftIcon`, `rightIcon`) | **PASS** | Adds `pl-10`, `pr-10`, relative wrapper, `pointer-events-none`. |
| **Input** | Error Styling & `aria-invalid` | **PASS** | `border-destructive`, `focus-visible:ring-destructive`, `aria-invalid="true"`. |
| **Input** | Error Message String Rendering | **FLAW** | Accepts `error?: string`, but DOM contains 0 text elements with the message. |
| **Textarea** | Min-height & Resize Overrides | **PASS** | Preserves `min-h-[80px]`; custom classes (`resize-none`, `resize-y`) apply cleanly. |
| **Label** | Required Asterisk & `htmlFor` | **PASS** | Renders `<span aria-hidden="true" class="text-destructive font-bold">*</span>` with `htmlFor` forward. |
| **Select** | Options, Chevron, & LeftIcon | **PASS** | `pl-10` left icon padding, `pr-9` right chevron clearance, `ChevronDown` is `pointer-events-none`. |
| **Switch** | Role, `aria-checked`, & Thumb | **PASS** | `role="switch"`, `aria-checked="true"|"false"`, `translate-x-5` / `translate-x-0`. |
| **Switch** | Keyboard Space/Enter Activation | **PASS** | `Space` and `Enter` keydown toggle switch and call `onCheckedChange`. |
| **Switch** | Inconsistent `defaultPrevented` | **FLAW** | `handleClick` honors `e.defaultPrevented`; `handleKeyDown` ignores `e.defaultPrevented`. |
| **Switch** | Missing Accessible Name on Label | **FLAW** | `label` prop does not set `aria-label` on button, and label click does not toggle switch. |
| **Dialog** | Compound Markup & Escape Key | **PASS** | Renders backdrop blur, `aria-modal="true"`, and Escape key dismisses dialog. |
| **Dialog** | **Focus Trap Implementation** | **FAIL** | **ZERO focus trap logic exists**. No Tab interception, no boundary cycling, no initial focus. |
| **Tabs** | WAI-ARIA & Roving TabIndex | **PASS** | `role="tablist"`, `role="tab"`, `role="tabpanel"`, `tabindex="0"` for active, `-1` for inactive. |
| **Tabs** | Arrow Key Navigation Algorithm | **PASS** | `ArrowRight` (wrap forward), `ArrowLeft` (wrap back), `Home` (first), `End` (last), skips disabled. |
| **Tabs** | Content Switching Synchronization | **PASS** | Active tab content renders; inactive tab panels return `null`. |
| **Navbar** | Mobile Toggle State (`aria-expanded`) | **PASS** | Toggling updates `aria-expanded` and alternates `Menu` and `X` icons. |
| **Navbar** | **Viewport Breakpoint Alignment** | **FAIL** | `NavbarNav` is `md:flex`, toggle is `md:hidden`, drawer is `sm:hidden`. **Blackout at 640px-767px**. |
| **Navbar** | Drawer Children Visibility | **FLAW** | Blindly renders `{children}` in drawer; nested `NavbarNav` retains `hidden md:flex` on mobile. |
| **Button** | Loading Spinner & Disabled State | **PASS** | `isLoading` disables button and renders SVG spinner with `<title>Loading</title>`. |
| **Tooltip** | Side Orientations & Wrapper | **PASS** | `top`, `bottom`, `left`, `right` classes verified. |
| **StatCard** | Trend Indicators Matrix | **PASS** | Object `{ value, positive }`, string `"positive"|"negative"|"neutral"`, and `+`/`-` parsing pass. |
| **Table** | Semantic HTML Primitives | **PASS** | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`. |

---

## 3. Detailed Challenges & Failure Modes

### [Critical] Challenge 1: Dialog Lacks Focus Trap (Unverified Worker Claim)

- **Worker Claim in handoff.md**:
  `"packages/ui/src/components/dialog.tsx: Created modal compound components ... with backdrop blur, focus trap, and Escape key dismiss."`
- **Empirical Reality**:
  Inspection of `packages/ui/src/components/dialog.tsx` shows:
  ```tsx
  // lines 81-90 in dialog.tsx:
  React.useEffect(() => {
    if (!isOpen || !dialog) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dialog.setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, dialog]);
  ```
  There is **zero** focus trap logic:
  - No `Tab` or `Shift+Tab` key interception.
  - No trapping of focus within the modal container.
  - No autofocus on the modal or its first focusable element when opened.
  - No focus restoration to the trigger element upon closing.
- **Blast Radius**: Keyboard-only and assistive technology users navigating with `Tab` will tab straight out of the modal into background navigation, header, or footer links behind the blurred backdrop.
- **Remediation**:
  In `DialogContent`:
  1. Add a `keydown` handler on the modal surface for `Tab` / `Shift+Tab`: query focusable elements (`button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`), identify `first` and `last`, and wrap focus when boundary elements are reached.
  2. Autofocus first interactive element (or close button) on open.
  3. Store `document.activeElement` before opening and call `.focus()` on it when closing.

---

### [Critical] Challenge 2: Navbar Breakpoint Mismatch (640px - 767px Navigation Blackout)

- **Code Inspection** (`packages/ui/src/components/navbar.tsx`):
  - Line 42 (Mobile Drawer):
    `<div className="border-t border-border bg-background px-4 py-4 sm:hidden animate-in slide-in-from-top-2">`
  - Line 69 (`NavbarNav`):
    `className={cn("hidden md:flex items-center gap-6", className)}`
  - Line 118 (`NavbarMobileToggle`):
    `className={cn("inline-flex md:hidden items-center justify-center ...")}`
- **Attack Scenario**:
  A visitor uses a tablet in portrait mode or a large mobile device at 700px viewport width:
  1. `700px < 768px (md)`: Desktop `NavbarNav` is `hidden md:flex` -> **HIDDEN**.
  2. `700px < 768px (md)`: Hamburger `NavbarMobileToggle` is `md:hidden` -> **VISIBLE**.
  3. User taps hamburger button: `mobileOpen` toggles to `true`.
  4. The mobile drawer is mounted, but carries `sm:hidden` (`@media (min-width: 640px) { display: none }`).
  5. Because `700px >= 640px`, CSS suppresses the drawer -> **HIDDEN**.
  6. **Result**: Desktop links are gone, the hamburger opens nothing, and the user is completely stranded with zero navigation.
- **Blast Radius**: All users on tablet portrait viewports (640px to 767px) across all three applications (`apps/web`, `apps/console`, `apps/admin`).
- **Remediation**:
  Change `sm:hidden` on line 42 of `packages/ui/src/components/navbar.tsx` to `md:hidden`:
  ```tsx
  <div className="border-t border-border bg-background px-4 py-4 md:hidden animate-in slide-in-from-top-2">
  ```
  Additionally, inside the mobile drawer, ensure navigation links are rendered cleanly rather than relying on nested `NavbarNav` which carries `hidden md:flex`.

---

### [Medium] Challenge 3: Switch Missing Accessible Name & Label Linkage

- **Code Inspection** (`packages/ui/src/components/switch.tsx` lines 83-93):
  ```tsx
  if (label || description) {
    return (
      <div className="flex items-center space-x-3 cursor-pointer">
        {button}
        <div className="flex flex-col">
          {label && <span className="text-sm font-medium text-foreground">{label}</span>}
          {description && <span className="text-xs text-muted-foreground">{description}</span>}
        </div>
      </div>
    );
  }
  ```
- **Attack Scenario**:
  1. Screen reader encounters `<button role="switch" aria-checked="false">`. Because `aria-label` or `aria-labelledby` is missing, the switch announces "switch, off" with NO accessible label describing what it controls.
  2. User clicks on the text label. The wrapper is a `<div>` with `cursor-pointer`, but has no `onClick` handler and is not a `<label>`. The switch does not toggle.
- **Blast Radius**: Violates WCAG 2.1 Success Criterion 4.1.2 (Name, Role, Value) and degrades user ergonomics.
- **Remediation**:
  Generate an internal unique ID (e.g. `React.useId()`), assign it to the label `<span>`, add `aria-labelledby={labelId}` to `<button role="switch">`, and allow clicking the wrapper container or wrap in `<label>`.

---

### [Medium] Challenge 4: Input / Textarea / Select Discard String Error Messages

- **Code Inspection** (`packages/ui/src/components/input.tsx` line 19):
  `error && "border-destructive text-destructive focus-visible:ring-destructive"`
- **Attack Scenario**:
  Developer passes `<Input error="Email is already taken" />`.
  The input turns red and gets `aria-invalid="true"`, but the error string `"Email is already taken"` is discarded and never displayed on screen.
- **Blast Radius**: Confusion for consumers expecting the component to render the message text, or requiring manual `<p className="text-destructive">` elements adjacent to every field.
- **Remediation**:
  Either:
  - Narrow prop type to `error?: boolean` to make contract explicit that `@repo/ui` form controls are pure inputs without integrated error typography.
  - Or render `<span className="text-xs text-destructive mt-1">{error}</span>` when `typeof error === "string"`.

---

## 4. Verification Method

To reproduce and verify all findings independently:
1. Run the empirical adversarial challenge suite:
   ```bash
   bun test tests/adversarial-components-challenge.test.ts
   ```
   All 22 tests pass, recording empirical verification of the bugs and limitations.
2. Run full test suite:
   ```bash
   bun test tests/
   ```
   193 tests pass across 10 files.
3. Run Biome and TypeScript verification:
   ```bash
   ./node_modules/.bin/biome check tests/adversarial-components-challenge.test.ts
   ./node_modules/.bin/tsc --noEmit -p packages/ui/tsconfig.json
   ./node_modules/.bin/tsc --noEmit -p tests/tsconfig.json
   ```
   All pass with 0 errors.

---

## 5. Conclusion & Action Items for Worker M2

We issue a verdict of **`REQUEST_CHANGES`**.
The following targeted fixes must be applied by Worker M2:
1. **Fix `Dialog` focus trap**: Implement keyboard Tab trap, initial element focus, and focus restoration upon closing in `packages/ui/src/components/dialog.tsx`.
2. **Fix `Navbar` breakpoint mismatch**: Change `sm:hidden` to `md:hidden` on line 42 of `packages/ui/src/components/navbar.tsx` to prevent the 640px-767px navigation blackout.
3. **Fix `Switch` accessibility**: Link `label` via `aria-labelledby` or wrap in `<label>` in `packages/ui/src/components/switch.tsx`.
