## 2026-10-14T10:33:51Z
You are Worker 2 (worker_m2), implementing Milestone 2: Reusable Component Suite in `@repo/ui`.
Your working directory is `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/worker_m2/`.
You MUST read:
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/ORIGINAL_REQUEST.md`
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/PROJECT.md`
- Component specifications: `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_survey_ui/survey_report.md` (Sections 5 & 6)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files:
- `packages/ui/src/components/*`
- `packages/ui/src/index.ts`
- `tests/unit/components.test.ts`

Mission & Deliverables:
Implement the complete, accessible, cohesive suite of UI primitive and pattern components in `@repo/ui` using React 19, Lucide icons (`lucide-react`), `class-variance-authority`, `clsx`, and `tailwind-merge` (`cn`).
All components must use semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `bg-accent`, `text-accent`, `border-border`, `focus-visible:ring-ring`, etc.) so they look pristine and high-contrast in both light and dark modes.

Components to implement / enhance:
1. `button.tsx`: Variants (`default`/`primary`, `secondary`, `outline`, `ghost`, `destructive`, `link`), sizes (`sm`, `md`, `lg`, `icon`), loading state (spinner), full interactive states (`active:scale-[0.98]`, `focus-visible:ring-2 focus-visible:ring-ring`, `disabled:opacity-50`).
2. `badge.tsx`: Variants (`default`, `secondary`, `success`, `warning`, `destructive`, `outline`) with high-contrast text and border styling for both themes.
3. `card.tsx`: Compound components (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`) with `interactive` variant option for hover elevation.
4. `input.tsx`: Input with `error` state, `leftIcon`/`rightIcon` slots, clear focus ring.
5. `textarea.tsx`: Accessible multi-line textarea with resize and error states.
6. `label.tsx`: Form label with `required` indicator support and accessible typography.
7. `select.tsx`: Styled accessible select component (custom or styled native-backed) with dropdown icon, consistent with `Input` dimensions.
8. `switch.tsx`: Accessible toggle component with `role="switch"`, `aria-checked`, keyboard toggle (`Space`/`Enter`), and smooth thumb animation.
9. `dialog.tsx`: Accessible modal/dialog compound components (`Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`) with backdrop blur, focus trap, and Escape key dismiss.
10. `alert.tsx`: Accessible callout banner (`Alert`, `AlertTitle`, `AlertDescription`) with variants (`default`, `info`, `success`, `warning`, `destructive`) and Lucide icon integration.
11. `table.tsx`: Semantic table compound components (`Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`) with zebra/hover rows and subtle borders.
12. `stat-card.tsx`: KPI/metric tile with `title`, `value`, `subtitle`, `icon`, and `trend` indicator (`{ value: string, positive?: boolean }` with upward/downward arrow and semantic badge).
13. `tabs.tsx`: Accessible tab compound components (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`) with keyboard arrow navigation and active pill/border styles.
14. `tooltip.tsx`: Declarative tooltip primitive with hover and focus disclosure.
15. `navbar.tsx`: Header navigation compound components (`Navbar`, `NavbarBrand`, `NavbarNav`, `NavbarLink`, `NavbarActions`, `NavbarMobileToggle`) supporting responsive mobile drawers.
16. `sidebar.tsx`: App shell sidebar compound components (`Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarNav`, `SidebarItem`, `SidebarFooter`) with active state styling and icon slots.
17. `empty-state.tsx`: Clean empty state illustration/icon, title, description, and action CTA button slot.
18. `skeleton.tsx`: Shimmer/pulse loading placeholder for text, cards, and avatars.

Export Surface:
Update `packages/ui/src/index.ts` to export all 18 components, types, and theme items cleanly.

Verification:
- `bun run --cwd packages/ui typecheck`: 0 errors.
- `bunx biome check packages/ui/src`: 0 errors.
- `bun test`: All tests continue to pass.
- Create unit tests in `tests/unit/components.test.ts` exercising the component suite.

Deliverables:
- Write changes to `changes.md` and complete a 5-section `handoff.md`.
- Send completion message to orchestrator when finished.
