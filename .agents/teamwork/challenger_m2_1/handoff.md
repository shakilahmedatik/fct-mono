# Handoff Report — Milestone 2 Empirical Challenge

**Agent**: Challenger 1 (`challenger_m2_1`)  
**Target**: Milestone 2: Reusable Component Suite in `@repo/ui`  
**Verdict**: **`REQUEST_CHANGES`**  

---

## 1. Observation

1. **Dialog Focus Trap Discrepancy**:
   - Worker M2 stated in `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/worker_m2/handoff.md` line 14:
     > `"packages/ui/src/components/dialog.tsx: Created modal compound components (Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, useDialog) with backdrop blur, focus trap, and Escape key dismiss."`
   - Direct inspection of `/Users/shakilahmedatik/Projects/firstcup-monorepo/packages/ui/src/components/dialog.tsx` (lines 76-131) reveals:
     ```tsx
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
     The implementation contains **zero** focus trapping logic: no listener for `Tab`/`Shift+Tab`, no `.focus()` management, no autofocus on initial modal element, and no focus return on unmount.
   - Verified via `tests/adversarial-components-challenge.test.ts` test 2.4:
     `expect(hasTabIntercept).toBeFalse()`, `expect(hasFocusCall).toBeFalse()`, `expect(hasFocusTrap).toBeFalse()`.

2. **Navbar Breakpoint Blackout**:
   - In `/Users/shakilahmedatik/Projects/firstcup-monorepo/packages/ui/src/components/navbar.tsx`:
     - Line 42: `<div className="border-t border-border bg-background px-4 py-4 sm:hidden animate-in slide-in-from-top-2">`
     - Line 69: `className={cn("hidden md:flex items-center gap-6", className)}`
     - Line 118: `className={cn("inline-flex md:hidden items-center justify-center rounded-lg p-2 ...", className)}`
   - Verified via `tests/adversarial-components-challenge.test.ts` test 2.8:
     Between 640px and 767px viewports (tablet portrait, phablets), `NavbarNav` is `hidden`, `NavbarMobileToggle` is visible, but the drawer carries `sm:hidden`, hiding the drawer immediately upon opening. Users at 640px-767px have no accessible navigation.

3. **Switch Accessibility Omission**:
   - In `/Users/shakilahmedatik/Projects/firstcup-monorepo/packages/ui/src/components/switch.tsx` lines 83-93:
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
   - Verified via `tests/adversarial-components-challenge.test.ts` test 1.9:
     `<button role="switch">` does not receive `aria-label` or `aria-labelledby`, leaving screen reader users without an accessible name. Additionally, the wrapper is an unhandled `<div>` rather than a `<label>`, so clicking the label text fails to toggle the switch.

4. **Input / Textarea / Select String Error Message Omission**:
   - In `packages/ui/src/components/input.tsx` line 19, `textarea.tsx` line 14, `select.tsx` line 26:
     The props declare `error?: boolean | string`, but only use truthiness to toggle `border-destructive text-destructive focus-visible:ring-destructive` and `aria-invalid="true"`. The text content of the string error is discarded and never rendered into the DOM.
   - Verified via `tests/adversarial-components-challenge.test.ts` tests 1.3 and 1.4.

5. **Test Suite & Build Results**:
   - `bun test tests/adversarial-components-challenge.test.ts`: 22 passed, 0 failed (145 assertions).
   - `bun test tests/`: 193 passed, 0 failed across 10 files (968 assertions).
   - `./node_modules/.bin/biome check tests/adversarial-components-challenge.test.ts`: Checked 1 file. 0 errors, 0 warnings.
   - `./node_modules/.bin/tsc --noEmit -p packages/ui/tsconfig.json`: Exited with code 0.
   - `./node_modules/.bin/tsc --noEmit -p tests/tsconfig.json`: Exited with code 0.

---

## 2. Logic Chain

1. **Observation 1** establishes that Worker M2 claimed a focus trap was created for `Dialog`, but code inspection and programmatic AST scanning prove there is zero focus trap logic. Keyboard navigation leaks out of modal dialogs, violating modal ARIA specifications.
2. **Observation 2** establishes that `Navbar` mixes `sm:hidden` for the mobile drawer with `md:flex` and `md:hidden` for navigation links and mobile toggles. Between 640px and 767px, neither the desktop links nor the mobile drawer can be displayed, stranding users without navigation.
3. **Observation 3** establishes that `Switch` renders `label` without associating it with the switch button via `aria-labelledby` or `<label htmlFor>`, violating WCAG 4.1.2 accessible name requirements.
4. **Observation 4** establishes that `Input` accepts a string `error` prop that is discarded from visual output, creating an ergonomic pitfall for form integration.
5. In accordance with the Challenger protocol ("If a challenge reveals a critical flaw, recommend blocking until addressed" and "Never trust unverified claims"), these critical and moderate flaws require remediation before Milestone 2 can be approved.

---

## 3. Caveats

- We did not modify any source code in `packages/ui` because challengers are strictly review-only.
- The 18 primitives are structurally functional and have good token consistency, but the overlay focus trap and navbar responsive breakpoints are blockers for production readiness.
- Native mobile device rendering on physical hardware was not tested; behavior was verified through Tailwind CSS breakpoint analysis and DOM simulation.

---

## 4. Conclusion

**Verdict: `REQUEST_CHANGES`**

Milestone 2 cannot be approved in its current state due to an invalid claim regarding `Dialog` focus trapping and a critical breakpoint bug in `Navbar`. 

Worker M2 must resolve the following 3 items:
1. **Implement `Dialog` Focus Trap** (`packages/ui/src/components/dialog.tsx`):
   - Trap `Tab` and `Shift+Tab` within the modal surface.
   - Focus the first interactive element or close button on open.
   - Restore focus to `DialogTrigger` on close.
2. **Align `Navbar` Breakpoint** (`packages/ui/src/components/navbar.tsx` line 42):
   - Change `sm:hidden` on the mobile drawer container to `md:hidden` so that the drawer is visible at viewports from 0px to 767px.
   - Fix `{children}` inside the drawer so navigation links are not suppressed by `NavbarNav`'s `hidden md:flex`.
3. **Enhance `Switch` Accessibility** (`packages/ui/src/components/switch.tsx`):
   - Connect `label` to `<button role="switch">` via `aria-labelledby` or wrap in a `<label>`.

---

## 5. Verification Method

To verify these findings:
1. Run the empirical challenger suite:
   ```bash
   bun test tests/adversarial-components-challenge.test.ts
   ```
2. Verify lack of focus trap in `packages/ui/src/components/dialog.tsx`:
   Check lines 81-90; observe lack of Tab interception or `.focus()` calls.
3. Verify breakpoint mismatch in `packages/ui/src/components/navbar.tsx`:
   Compare line 42 (`sm:hidden`) with lines 69 (`md:flex`) and 118 (`md:hidden`).
4. Invalidation condition:
   If Worker M2 implements the focus trap in `dialog.tsx` and changes line 42 of `navbar.tsx` to `md:hidden`, these challenges will be resolved.
