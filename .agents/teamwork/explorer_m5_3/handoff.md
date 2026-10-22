# Handoff Report — AI Playground Overhaul & Safety Remediation (Feature F34)

**Agent**: `explorer_m5_3`  
**Milestone**: M5 (Admin App Revamp)  
**Date**: 2026-10-14  
**Handoff Type**: Hard (Investigation complete, actionable blueprint produced)  

---

## 1. Observation

### Direct Observations from Workspace Inspection:

1. **Exact Usages of `window.prompt` and `window.alert`**:
   - Location: `/Users/shakilahmedatik/Projects/firstcup-monorepo/apps/admin/src/app/playground/components/SourcesPanel.tsx`
   - Lines 32, 36, and 40 verbatim:
     ```tsx
     32: const url = window.prompt("Enter RSS Feed URL (e.g., https://hnrss.org/newest):");
     33: if (!url) return;
     34: try {
     35:   const def = new URL(url);
     36:   const name = window.prompt("Enter a short name for this feed:", def.hostname);
     37:   if (!name) return;
     38:   onAdd(url, name);
     39: } catch {
     40:   alert("Invalid URL format.");
     41: }
     ```
   - Total occurrences in `apps/admin/src`: exactly 2 calls to `window.prompt` and 1 call to `alert`.

2. **Crude Ad-Hoc Tab Navigation**:
   - Location: `/Users/shakilahmedatik/Projects/firstcup-monorepo/apps/admin/src/app/playground/page.tsx`
   - Lines 86–111 verbatim:
     ```tsx
     86:           <div
     87:             className="flex gap-1 border-b border-border/40 pb-0"
     88:             role="tablist"
     89:             aria-label="Result view"
     90:           >
     91:             {(["data", "logs", "output"] as const).map((tab) => (
     92:               <button
     93:                 key={tab}
     94:                 type="button"
     95:                 role="tab"
     ...
     109:              </button>
     110:            ))}
     111:          </div>
     ```
   - Uses manual `<button>` tags without keyboard arrow-key navigation, ARIA roving tabindex, or compound `@repo/ui` `Tabs`.
   - Completely omits dedicated workbenches for Prompt Engineering, Audio Generation, and Vector Search.

3. **Missing Parameter Controls**:
   - In `apps/admin/src/app/playground/components/ParametersPanel.tsx`, parameters are limited to cluster threshold, rank limit, and audio duration.
   - Missing: Model selection (`Select` for `gemini-2.5-flash`), temperature slider with numerical badges, and system instructions `Textarea`.
   - In `apps/admin/src/app/playground/components/AiConfigPanel.tsx`, model identifier is a raw `<input>` field without curated selection options.

4. **Unguarded Destructive Actions**:
   - In `apps/admin/src/app/playground/components/Header.tsx`, line 102:
     ```tsx
     100: <button
     101:   type="button"
     102:   onClick={onClear}
     103:   className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/20"
     104: >
     105:   🗑️ Clear
     106: </button>
     ```
     Clicking immediately triggers `clearCurrentSession()` without confirmation or accessibility warnings.

5. **`@repo/ui` Component Suite Availability**:
   - Inspected `packages/ui/src/index.ts` and confirmed the exports of:
     - `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`
     - `Alert`, `AlertTitle`, `AlertDescription` (variants: default, info, success, warning, destructive)
     - `Select`, `SelectOption`
     - `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
     - `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
     - `Input`, `Textarea`, `Button`, `Badge`, `Label`

---

## 2. Logic Chain

1. **From Observation 1**: The calls to `window.prompt` and `alert` halt JavaScript execution, prevent screen reader announcement, bypass all theme tokens, and cause failures during headless or automated tests.
2. **From Observation 1 & 5**: Replacing these lines with `@repo/ui` `Dialog` compound components (`AddCustomRssDialog`) containing form inputs (`Input`, `Label`) and inline `@repo/ui` `Alert` banner (`variant="destructive"`) completely resolves the security, accessibility, and visual hierarchy issues while preserving full URL and name ingestion logic.
3. **From Observation 2 & 5**: The playground page currently segregates results into a tiny subpanel. By replacing lines 86–111 with `@repo/ui` `Tabs` (`TabsList`, `TabsTrigger`, `TabsContent`), the page transforms into an integrated test workbench featuring dedicated testing spaces for "Prompt Engineering", "Audio Generation", "Vector Search", and "Pipeline & Logs".
4. **From Observation 3 & 5**: Providing a dedicated `PromptWorkbench` equipped with `@repo/ui` `Select` for `gemini-2.5-flash`, a temperature range slider, and a system instructions `Textarea` directly satisfies Feature F34's core objective of interactive AI experimentation.
5. **From Observation 4 & 5**: Wrapping the session clear button in `ClearSessionDialog` prevents accidental data loss and provides standard WCAG keyboard accessibility.

---

## 3. Caveats

- **API Endpoint Availability**: The Prompt Workbench can connect to the existing `/admin/playground/ai/test` endpoint on `apps/api`. For multi-turn or custom generative prompt testing, the endpoint executes connection/model checks or returns structured synthetic responses when API keys are unconfigured in development.
- **Read-Only Scope**: In adherence to explorer constraints, no source files were modified during this investigation. All component code and replacement structures are fully documented in `fix_strategy.md`.

---

## 4. Conclusion

Feature F34 can be cleanly, safely, and comprehensively implemented by:
1. Extracting and embedding `AddCustomRssDialog` in `SourcesPanel.tsx` to remediate lines 32, 36, and 40.
2. Adding `ClearSessionDialog` in `Header.tsx` to guard session resets.
3. Structuring `apps/admin/src/app/playground/page.tsx` around `@repo/ui` `Tabs` with 4 dedicated panels:
   - **Prompt Engineering**: Model selector (`Select` with `gemini-2.5-flash`), temperature slider, system instructions `Textarea`, and live response card.
   - **Audio Generation**: TTS selector (`kokoro-v0.19`, `elevenlabs`, `deepgram`), voice selector, duration limits, script editor, and audio player.
   - **Vector Search**: Semantic query input, similarity metric, cluster threshold slider, and similarity badges.
   - **Pipeline & Logs**: Preserving the 10-step autonomous pipeline runner, data inspector, logs, and BullMQ queue dashboard.
4. Replacing all remaining raw HTML tags with `@repo/ui` primitives.

The complete blueprint and drop-in code structures are available at:  
`/.agents/teamwork/explorer_m5_3/fix_strategy.md`

---

## 5. Verification Method

Once the worker agent implements the changes from `fix_strategy.md`, independently verify via:

1. **Static Anti-Pattern Scan**:
   ```bash
   # Must return ZERO matches in apps/admin/src/app/playground
   grep -rnE "(window\.prompt|window\.alert|prompt\(|alert\()" apps/admin/src/app/playground
   ```

2. **Automated Test Verification**:
   ```bash
   bun test tests/e2e/test_no_prompt_alert.test.ts
   ```

3. **Typecheck & Lint**:
   ```bash
   bun run --filter=@repo/admin typecheck
   bun x @biomejs/biome check apps/admin/src/app/playground
   ```

4. **Next.js Production Build**:
   ```bash
   bun run --filter=@repo/admin build
   ```
