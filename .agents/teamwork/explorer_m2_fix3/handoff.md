# Handoff Report — Milestone 2 Remediation: Switch & Form Inputs Accessible Error Messaging

**Agent**: Explorer 3 (`explorer_m2_fix3`)  
**Mission**: Milestone 2 Remediation Investigation (Switch & Form Inputs)  
**Parent Conversation ID**: `2d94057c-60a1-4b0c-9f22-cfd82486a9ea`  
**Handoff Type**: Hard (Task Complete)  

---

## 1. Observation

1. **Switch Component Label Linkage & Accessibility (`packages/ui/src/components/switch.tsx`)**:
   - Lines 57-80 render `<button role="switch">` without an `id`, `aria-labelledby`, or `aria-describedby`:
     ```tsx
     const button = (
       <button
         type="button"
         role="switch"
         aria-checked={checked}
         disabled={disabled}
         ref={ref}
         onClick={handleClick}
         onKeyDown={handleKeyDown}
         className={cn(...)}
         {...props}
       >
     ```
   - Lines 83-93 render `label` inside an unlinked `<span>` within an unhandled `<div>`:
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
     `expect(labeledInspector.hasAttribute("aria-labelledby")).toBeFalse()`, `expect(labeledInspector.contains("<label")).toBeFalse()`.
   - In lines 49-55, `handleKeyDown` in `switch.tsx` does not check `!e.defaultPrevented`, whereas `handleClick` on line 44 does:
     ```tsx
     const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
       onKeyDown?.(e);
       if (e.key === " " || e.key === "Enter") {
         e.preventDefault();
         toggle();
       }
     };
     ```

2. **Input Textual Error Message Omission (`packages/ui/src/components/input.tsx`)**:
   - Lines 11-26 accept `error?: boolean | string`, but only use truthiness to toggle classes and `aria-invalid="true"`:
     ```tsx
     aria-invalid={error ? "true" : props["aria-invalid"]}
     ```
   - When `typeof error === "string"` and non-empty, the string content is never injected into the DOM.
   - Line 107 in `tests/adversarial-components-challenge.test.ts` requires that inputs without icons and without string error do not use a wrapper `<div>`:
     ```ts
     expect(neitherInspector.html.startsWith("<input")).toBeTrue();
     ```

3. **Textarea Textual Error Message Omission (`packages/ui/src/components/textarea.tsx`)**:
   - Lines 8-23 discard string error message content and only set `aria-invalid={error ? "true" : props["aria-invalid"]}`.
   - Verified via `tests/adversarial-components-challenge.test.ts` test 1.4:
     `expect(errorInspector.contains("Field required")).toBeFalse()`.

4. **Select Textual Error Message Omission (`packages/ui/src/components/select.tsx`)**:
   - Lines 12-38 wrap `<select>` and ChevronDown in `<div className="relative flex w-full items-center">`.
   - Discards string error text. Any error message added to this component must be placed beneath the select control in a block container rather than inline in the horizontal flex row.

5. **Test Suite Baseline**:
   - Running `bun test tests/`: 193 passed, 0 failed across 10 files (968 assertions) in 785ms.
   - Running `./node_modules/.bin/tsc --noEmit -p packages/ui/tsconfig.json && ./node_modules/.bin/biome check packages/ui`: 0 errors, 0 warnings.

---

## 2. Logic Chain

1. From **Observation 1**, `Switch` fails WCAG AA 4.1.2 accessible name guidelines because screen readers navigating to the `<button role="switch">` cannot determine its name without `aria-label` or `aria-labelledby`.
2. From **Observation 1**, rendering `label` inside a `<span>` rather than an HTML `<label htmlFor={switchId}>` deprives users of standard browser activation where clicking the label text focuses and toggles the switch.
3. Introducing `const switchId = id || React.useId()` and `const labelId = label ? `${switchId}-label` : undefined`, and attaching `id={switchId}` and `aria-labelledby={props["aria-labelledby"] || labelId}` to `<button role="switch">`, along with `<label htmlFor={switchId} id={labelId}>`, provides both accessible name resolution and native click toggling.
4. From **Observation 2, 3, and 4**, all three form controls (`Input`, `Textarea`, `Select`) declare support for `error?: boolean | string`, but silently ignore string messages. This causes friction for application forms and inconsistent user experiences.
5. In accordance with requirements, when `typeof error === "string"` and `error.trim().length > 0`, rendering `<p id={errorId} className="mt-1.5 text-xs text-destructive" role="alert">{error}</p>` directly beneath each form control and linking it via `aria-describedby` provides immediate screen reader announcements and visible feedback.
6. From **Observation 2**, when no error text is present and no icons are attached, `Input` and `Textarea` must return the raw `<input>` / `<textarea>` elements to preserve root element assertions (`html.startsWith("<input")`).
7. Full, copy-pasteable replacement code has been provided in `.agents/teamwork/explorer_m2_fix3/fix_strategy.md`.

---

## 3. Caveats

- In accordance with explorer read-only constraints, no source code files in `packages/ui` or `tests/` were modified by this agent.
- `tests/adversarial-components-challenge.test.ts` previously documented the limitations by asserting `toBeFalse()` on text presence and label tags (tests 1.3, 1.4, and 1.9). These three tests will fail after the fix unless updated to `toBeTrue()` as documented in `fix_strategy.md`.

---

## 4. Conclusion

Remediation plan is fully specified and validated against the repository's architecture, typechecker, and test harness:
1. **Switch**: Replace `<span>` with `<label htmlFor={switchId} id={labelId}>`, set `id={switchId}` and `aria-labelledby` on `<button role="switch">`, and check `!e.defaultPrevented` in `handleKeyDown`.
2. **Input, Textarea, Select**: Conditionally render `<p id={errorId} className="mt-1.5 text-xs text-destructive" role="alert">{error}</p>` beneath the control when `typeof error === "string" && error.trim().length > 0`, link via `aria-describedby`, and maintain raw unwrapped elements when error text is absent.
3. Complete drop-in code and test updates are ready for Worker implementation in `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m2_fix3/fix_strategy.md`.

---

## 5. Verification Method

To independently verify the recommendations:
1. Review the proposed code in `.agents/teamwork/explorer_m2_fix3/fix_strategy.md`.
2. After the Worker applies the proposed changes to `switch.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, and updates tests 1.3, 1.4, 1.9 in `tests/adversarial-components-challenge.test.ts`:
   ```bash
   bun test tests/
   ./node_modules/.bin/tsc --noEmit -p packages/ui/tsconfig.json
   ./node_modules/.bin/biome check packages/ui
   ```
3. Invalidation condition: If clicking `<label htmlFor={switchId}>` fails to toggle the switch, or if `Input` with string error fails to render `<p className="mt-1.5 text-xs text-destructive" role="alert">{error}</p>`, this strategy is invalidated.
