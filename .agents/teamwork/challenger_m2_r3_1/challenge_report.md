# Milestone 2 Round 3 Adversarial Challenge Report: Form Control Prop Precedence & Accessibility

**Evaluator**: Challenger 1 Round 3 (`challenger_m2_r3_1`)  
**Target**: Milestone 2 Round 3 Remediations (`@repo/ui` Form Controls)  
**Date**: 2026-10-14  
**Verdict**: **`APPROVE`**  
**Overall Risk Assessment**: **LOW**

---

## Challenge Summary

**Overall risk assessment**: LOW  
**Verdict**: **APPROVE**

In Milestone 2 Round 2, Challenger 2 noted that JSX prop spreading order in form controls (`Input`, `Textarea`, `Select`) spread `{...props}` *after* computed `aria-describedby`, which caused caller-supplied `aria-describedby="custom-help"` to overwrite the computed error ID linkage `${callerDescribedBy} ${errorId}`.

Worker M2 Generation 3 (`worker_m2_gen3`) remediated the form control suite by:
1. Spreading `{...props}` *first* on the underlying `<input>`, `<textarea>`, and `<select>` elements.
2. Placing design-system managed attributes (`ref`, `id`, `type`, `className`, `aria-invalid`, `aria-describedby`) *after* `{...props}`.
3. Dynamically computing `aria-describedby` to merge existing caller descriptors with `${id}-error` whenever a non-empty string error is provided (`${props["aria-describedby"]} ${errorId}`).
4. Rendering an accessible error paragraph `<p id="${errorId}" className="mt-1.5 text-xs text-destructive" role="alert">{error}</p>`.
5. Ensuring boolean errors (`error={true}`) apply error styles and `aria-invalid="true"` without corrupting `aria-describedby` or generating orphan/empty error alerts.

Challenger 1 Round 3 empirically verified and stress-tested these remediations via dedicated automated harnesses (`tests/e2e/challenger-m2-r2-empirical.test.ts`), unit suites (`tests/unit/components.test.ts`), and workspace-wide verification (`bun test`, `bun tests/e2e/run-all.ts`, `tsc`, `biome`).

All tests pass with 100% success rate. The remediations are robust, standards-compliant, and introduce zero regressions.

---

## Challenges

### [Resolved / Low Risk] Challenge 1: JSX Prop Spreading Order & Caller aria-describedby Overwrite

- **Assumption challenged**: Spreading caller props after computed accessibility attributes in form controls will clobber computed `aria-describedby` values and sever screen reader association with error alerts (WCAG 3.3.1).
- **Attack scenario**: A consumer passes an existing helper reference together with validation error text:
  ```tsx
  <Input id="user" aria-describedby="custom-help" error="Username already taken" />
  ```
  If `{...props}` is placed after `aria-describedby`, React will overwrite the combined string `"custom-help user-error"` back to `"custom-help"`, breaking screen reader announcement of the error message.
- **Blast radius**: Assistive technology users do not hear error messages announced upon field invalidation.
- **Empirical verification**:
  - `packages/ui/src/components/input.tsx` (lines 18–38): `{...props}` is placed at line 19; `aria-describedby` is evaluated and bound at lines 31–37.
  - `packages/ui/src/components/textarea.tsx` (lines 16–33): `{...props}` is placed at line 17; `aria-describedby` is evaluated and bound at lines 26–32.
  - `packages/ui/src/components/select.tsx` (lines 24–42): `{...props}` is placed at line 25; `aria-describedby` is evaluated and bound at lines 30–36.
  - In all three components, the rendered markup has `aria-describedby="custom-help <id>-error"` and a linked `<p id="<id>-error" role="alert">`.
- **Status**: **RESOLVED & VERIFIED**.

### [Resolved / Low Risk] Challenge 2: Custom Caller Attribute Passthrough & Conflict Avoidance

- **Assumption challenged**: Placing `{...props}` first might suppress or alter custom caller attributes (`data-testid`, `disabled`, `value`, `placeholder`, `onChange`, `name`, `autoComplete`, `required`).
- **Attack scenario**: Form controls fail to pass through custom telemetry attributes (`data-testid`), form submission values (`value`, `defaultValue`), event callbacks (`onChange`), or accessibility state (`disabled`).
- **Blast radius**: Consumer tests break due to missing `data-testid`, or forms fail to submit correct values.
- **Empirical verification**:
  - Verified in `tests/e2e/challenger-m2-r2-empirical.test.ts` test 2.2:
    - `Input`: `data-testid="custom-test-input"`, `disabled={true}`, `value="john.doe@example.com"`, `placeholder="Enter user email"`, `onChange`, `name="user_email"`, `autoComplete="email"`, `maxLength={100}`, `required={true}` pass cleanly to `<input>`.
    - `Textarea`: `data-testid="custom-test-textarea"`, `disabled={true}`, `value="Initial feedback content"`, `placeholder="Provide constructive comments"`, `onChange`, `rows={6}`, `cols={40}`, `name="feedback"`, `spellCheck={false}` pass cleanly to `<textarea>`.
    - `Select`: `data-testid="custom-test-select"`, `disabled={true}`, `value="enterprise"`, `placeholder="Select plan"`, `onChange`, `name="subscription_tier"`, `required={true}` pass cleanly to `<select>`.
  - All callbacks execute properly; all attributes are preserved in static markup.
- **Status**: **RESOLVED & VERIFIED**.

### [Resolved / Low Risk] Challenge 3: Boolean Error vs String Error Asymmetry

- **Assumption challenged**: Passing `error={true}` (boolean flag) might append an undefined or non-existent error ID to `aria-describedby` or render an empty `<p role="alert">`.
- **Attack scenario**: A consumer passes `<Input error={true} aria-describedby="custom-help" />`. If the component appends `undefined-error` or renders `<p id="undefined-error" role="alert"></p>`, assistive technology announces an empty alert or references an invalid ID.
- **Blast radius**: Screen reader confusion due to empty live regions or dangling ID references.
- **Empirical verification**:
  - `hasErrorText` strictly tests `typeof error === "string" && error.trim().length > 0`.
  - When `error={true}`, `hasErrorText` is `false`, `errorId` is `undefined`, and `<p role="alert">` is not rendered.
  - The rendered input has `aria-describedby="custom-help"` without any trailing `-error` token, and `aria-invalid="true"`.
- **Status**: **RESOLVED & VERIFIED**.

---

## Stress Test Results

| # | Stress Scenario | Expected Behavior | Actual Behavior | Result |
|---|-----------------|-------------------|-----------------|--------|
| 1 | `Input` with explicit `id="custom-input"`, `aria-describedby="custom-help"`, `error="Username taken"` | Renders `aria-describedby="custom-help custom-input-error"`, `aria-invalid="true"`, and `<p id="custom-input-error" role="alert">` | `aria-describedby="custom-help custom-input-error"`, `aria-invalid="true"`, and alert paragraph present in markup | **PASS** |
| 2 | `Input` with auto-generated ID, `aria-describedby="custom-help"`, `error="Email is required"` | Auto-generates `autoId`, binds `aria-describedby="custom-help <autoId>-error"`, and `<p id="<autoId>-error" role="alert">` | Auto ID generated; `aria-describedby` correctly references `<autoId>-error` | **PASS** |
| 3 | `Input` with `leftIcon` and `rightIcon` adornments + error | Wraps input in relative container, renders adornments, retains `aria-describedby` and alert paragraph | Icon wrappers present; accessibility attributes and error paragraph intact | **PASS** |
| 4 | `Input` with `error={true}` (boolean error) | Applies destructive border and `aria-invalid="true"`; does NOT append non-existent error ID; does NOT render empty alert | Retains caller `aria-describedby="custom-help"`; zero orphan error paragraphs | **PASS** |
| 5 | `Textarea` with explicit ID, `aria-describedby="custom-help"`, `error="Description too short"` | Renders `aria-describedby="custom-help custom-textarea-error"`, `aria-invalid="true"`, and `<p id="custom-textarea-error" role="alert">` | `aria-describedby` merged; `<p role="alert">` rendered | **PASS** |
| 6 | `Textarea` with auto-generated ID + error | Renders `aria-describedby="custom-help <autoId>-error"` and `<p id="<autoId>-error" role="alert">` | Auto ID generated; `aria-describedby` correctly references generated error ID | **PASS** |
| 7 | `Textarea` with `error={true}` (boolean error) | Applies destructive border and `aria-invalid="true"`; does NOT append error ID to `aria-describedby` | Clean caller `aria-describedby="custom-help"`; no alert rendered | **PASS** |
| 8 | `Select` with explicit ID, `aria-describedby="custom-help"`, `error="Please select an option"` | Renders `aria-describedby="custom-help custom-select-error"`, `aria-invalid="true"`, and `<p id="custom-select-error" role="alert">` | `aria-describedby` merged; `<p role="alert">` rendered | **PASS** |
| 9 | `Select` with auto-generated ID + error | Renders `aria-describedby="custom-help <autoId>-error"` and `<p id="<autoId>-error" role="alert">` | Auto ID generated; `aria-describedby` correctly references generated error ID | **PASS** |
| 10 | `Select` with `error={true}` (boolean error) | Applies destructive border and `aria-invalid="true"`; does NOT append error ID to `aria-describedby` | Clean caller `aria-describedby="custom-help"`; no alert rendered | **PASS** |
| 11 | Custom caller attributes passthrough on `Input` | `data-testid`, `disabled`, `value`, `placeholder`, `onChange`, `name`, `autoComplete`, `maxLength`, `required` preserved on `<input>` | All 9 attributes/handlers present and functional | **PASS** |
| 12 | Custom caller attributes passthrough on `Textarea` | `data-testid`, `disabled`, `value`, `placeholder`, `onChange`, `rows`, `cols`, `name`, `spellCheck` preserved on `<textarea>` | All 9 attributes/handlers present and functional | **PASS** |
| 13 | Custom caller attributes passthrough on `Select` | `data-testid`, `disabled`, `value`, `placeholder`, `onChange`, `name`, `required` preserved on `<select>` | All 7 attributes/handlers present and functional | **PASS** |
| 14 | Multi-token caller `aria-describedby="hint-1 hint-2"` | Merges cleanly to `aria-describedby="hint-1 hint-2 <id>-error"` | Renders `"hint-1 hint-2 multi-input-error"` | **PASS** |
| 15 | Whitespace-only string error `error="   "` | Trims whitespace and treats as non-error; does NOT render alert paragraph | Zero alert paragraphs rendered; no error ID appended | **PASS** |
| 16 | Targeted Test 2.1 (`bun test tests/e2e/challenger-m2-r2-empirical.test.ts -t "2.1"`) | Passes 100% | 1 pass, 0 fail (49 expect calls) | **PASS** |
| 17 | Targeted Test 2.2 (`bun test tests/e2e/challenger-m2-r2-empirical.test.ts -t "2.2"`) | Passes 100% | 1 pass, 0 fail (28 expect calls) | **PASS** |
| 18 | Unit Test Suite (`bun test tests/unit/components.test.ts`) | All 38 component unit tests pass | 38 pass, 0 fail (245 expect calls) | **PASS** |
| 19 | Monorepo Test Suite (`bun test`) | All monorepo tests pass | 268 pass, 0 fail (1280 expect calls) | **PASS** |
| 20 | Monorepo E2E Runner (`bun tests/e2e/run-all.ts`) | All 4 tiers pass | 62 pass, 0 fail (100% in 390ms) | **PASS** |
| 21 | Biome Linter (`biome check`) | 27 files checked, 0 errors | Clean lint and formatting | **PASS** |
| 22 | TypeScript Typecheck (`packages/ui` & all 3 apps) | Zero compiler errors | Clean compile across workspace | **PASS** |

---

## Unchallenged Areas

- **Native Browser Autofill Popups**: Browser-native OS autofill UI overlays (e.g., macOS Keychain password suggestions) were evaluated via static markup inspection and DOM attribute contracts (`autoComplete="email"`, etc.), not live headless browser keystroke automation.

---

## Conclusion & Verdict

**Verdict**: **`APPROVE`**

The Milestone 2 Round 3 remediations for form control prop precedence and accessibility in `@repo/ui` (`Input`, `Textarea`, `Select`) meet all specification and accessibility requirements. The implementation correctly preserves caller-provided `aria-describedby` attributes while composing validation error references and rendering WAI-ARIA `role="alert"` messages. Custom attributes pass through without obstruction, and the full test suite passes with zero defects.
