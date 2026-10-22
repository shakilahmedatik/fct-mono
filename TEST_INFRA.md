# E2E Test Infrastructure & Test Philosophy

## 1. Test Philosophy & Design Principles

The FirstCup monorepo E2E testing framework is engineered around four core tenets:

1. **Requirement-Driven & Opaque-Box**:
   Tests are written strictly against user requirements and interface contracts defined in `PROJECT.md` and `ORIGINAL_REQUEST.md`, treating modules and applications as black boxes. Tests do not inspect internal implementation details or private closures; they evaluate observable outputs: rendered HTML structure, ARIA accessibility attributes, CSS class hierarchies, computed WCAG contrast ratios, storage persistence, and state transitions.

2. **Progressive Testability & Interface Contracts**:
   Testing progresses gracefully alongside milestone delivery. Tests verify current implementations (M1 Theme & Tokens, early primitives, application shells) while verifying the complete structural contracts for future milestones (M2 Component Suite, M3 Web Revamp, M4 Console Revamp, M5 Admin Revamp). When milestones land, the test harness automatically exercises their live implementations without requiring test rewrites.

3. **Deterministic & Flakeless Execution**:
   Traditional browser automation (e.g. headless Chromium instances) introduces substantial flakiness, latency, network socket dependency, and environment permission friction. FirstCup's E2E test harness uses a high-performance in-process execution model powered by Bun, React 19 DOM server rendering, and an isolated browser environment emulator (`mock-dom.ts`). State transitions, storage events, media queries, and touch events execute with microsecond latency and zero non-deterministic flakiness.

4. **Authoritative Mathematical Grounding**:
   Visual and accessibility compliance (F02) is grounded in strict mathematical formulas conforming directly to the W3C Web Content Accessibility Guidelines (WCAG) 2.1 relative luminance ($L$) and contrast ratio ($CR$) standards:
   $$CR = \frac{L_1 + 0.05}{L_2 + 0.05}$$
   Every color token pair is evaluated against WCAG AA requirements ($\ge 4.5:1$ for body copy, $\ge 3:1$ for large text and UI components).

---

## 2. Feature Inventory (F01 – F36)

The test suite systematically covers all 36 monorepo features across four operational tiers:

| Feature ID | Feature Title | Target Module / App | Scope & Contract | Test Tier Coverage |
|------------|---------------|---------------------|------------------|-------------------|
| **F01** | Tailwind v4 Theme Tokens | `@repo/ui/src/styles.css` | `:root` & `.dark` HSL variables, `@theme` mapping | Tier 1 (Tokens), Tier 2 (Corrupt), Tier 3 (Pairwise) |
| **F02** | WCAG AA Color Compliance | `@repo/ui/src/styles.css` | $\ge 4.5:1$ text, $\ge 3:1$ UI borders & controls | Tier 1 (Contrast Math), Tier 3 (Surface Pairs) |
| **F03** | Zero-FOUC ThemeScript | `@repo/ui` | Inline `<script>` reading storage & applying `.dark` | Tier 1 (Script Output), Tier 2 (Throws), Tier 3 (FOUC) |
| **F04** | Dynamic ThemeProvider | `@repo/ui` | React Context managing `light`, `dark`, `system` | Tier 1 (State Machine), Tier 2 (Storage Failures) |
| **F05** | ThemeToggle Component | `@repo/ui` | Dropdown, cycle, and segmented variants with ARIA | Tier 1 (ARIA & Roles), Tier 2 (Rapid Click), Tier 3 |
| **F06** | Tailwind Content Discovery | `apps/*/src/app/globals.css` | `@source` and `@import` synthesis | Tier 1 (Syntax & Paths) |
| **F07** | Button & IconButton | `@repo/ui` | Variants, sizes, loading spinner, focus-visible | Tier 1 (Primitives), Tier 2 (Disabled), Tier 3 (Form) |
| **F08** | Badge Component | `@repo/ui` | Semantic variants (`default`, `success`, `destructive`)| Tier 1 (Badges), Tier 3 (Status Displays) |
| **F09** | Card Primitive Suite | `@repo/ui` | Compound `Card`, `Header`, `Title`, `Content`, `Footer` | Tier 1 (Cards), Tier 2 (Empty & Long Content) |
| **F10** | Form Controls Suite | `@repo/ui` | `Input`, `Textarea`, `Label`, `Select`, `Switch` | Tier 1 (Input Attributes), Tier 3 (Forms & Errors) |
| **F11** | Dialog / Modal Suite | `@repo/ui` | Compound `Dialog`, accessible overlay, focus trap | Tier 1 (Contract), Tier 3 (Theme x Modal), Tier 4 |
| **F12** | Alert & Callout | `@repo/ui` | Accessible banner (`info`, `warning`, `destructive`) | Tier 1 (Contract), Tier 3 (Alert Contrast) |
| **F13** | Table Component Suite | `@repo/ui` | Semantic table primitives, captions, headers | Tier 1 (Contract), Tier 2 (Empty), Tier 4 (Admin) |
| **F14** | StatCard / KPI Tile | `@repo/ui` | Metric tile with title, value, trend indicator | Tier 1 (Contract), Tier 2 (Zero/NaN), Tier 4 (Console) |
| **F15** | Tabs Suite | `@repo/ui` | Compound `Tabs`, `List`, `Trigger`, `Content` | Tier 1 (Contract), Tier 3 (Tabs x Theme) |
| **F16** | Tooltip Primitive | `@repo/ui` | Disclosure tooltip with hover/focus disclosure | Tier 1 (Contract), Tier 2 (Overflow) |
| **F17** | Navigation Suite | `@repo/ui` | `Navbar`, `Sidebar`, `NavItem`, mobile drawer | Tier 1 (Contract), Tier 3 (Nav x Theme) |
| **F18** | EmptyState & Skeleton | `@repo/ui` | Empty data displays and loading skeletons | Tier 1 (Contract), Tier 2 (Empty Data) |
| **F19** | `apps/web` Landing Page | `apps/web/src/app/page.tsx` | Hero, CTA, feature grid, audio briefing card | Tier 1 (Routes), Tier 4 (Marketing Flow) |
| **F20** | `apps/web` Pricing Page | `apps/web/src/app/pricing/` | Pricing cards, tiers, annual toggle | Tier 1 (Routes), Tier 4 (Pricing Flow) |
| **F21** | `apps/web` Blog & Posts | `apps/web/src/app/blog/` | Blog index, post detail, tag filters | Tier 1 (Routes), Tier 4 (Reader Flow) |
| **F22** | `apps/web` Contact Page | `apps/web/src/app/contact/` | Inquiry form, channels, FAQ | Tier 1 (Routes), Tier 4 (Contact Flow) |
| **F23** | `apps/web` Layout & Header | `apps/web/src/app/layout.tsx` | Header, navigation, theme toggle, footer | Tier 1 (Layouts), Tier 3 (Nav Sync) |
| **F24** | `apps/console` Auth Isolation | `apps/console/src/app/(auth)/` | Standalone login layout without console sidebar | Tier 1 (Auth Route), Tier 4 (Auth Journey) |
| **F25** | `apps/console` Shell & Nav | `apps/console/src/app/layout` | Console sidebar, active links, user profile | Tier 1 (Shell), Tier 3 (Console Nav), Tier 4 |
| **F26** | `apps/console` Dashboard | `apps/console/src/app/dashboard`| Daily audio digest card, metrics, quick actions | Tier 1 (Dashboard), Tier 4 (Subscriber Journey) |
| **F27** | `apps/console` Preferences | `apps/console/src/app/preferences`| Notification channels, topic selection form | Tier 1 (Preferences), Tier 4 (Preferences Flow)|
| **F28** | `apps/console` Billing Page | `apps/console/src/app/billing` | Usage meters, current plan, invoice history | Tier 1 (Billing), Tier 4 (Billing Flow) |
| **F29** | `apps/console` Login Page | `apps/console/src/app/(auth)/` | Centered login card, form inputs, brand header | Tier 1 (Login), Tier 4 (Sign-in Flow) |
| **F30** | `apps/admin` Shell & Nav | `apps/admin/src/app/layout.tsx` | Admin navigation, status badge, theme toggle | Tier 1 (Admin Shell), Tier 4 (Admin Journey) |
| **F31** | `apps/admin` Dashboard | `apps/admin/src/app/dashboard` | Platform KPI stats, operations queue | Tier 1 (Admin Dash), Tier 4 (KPI Review) |
| **F32** | `apps/admin` User Directory | `apps/admin/src/app/users` | User table, search/filter bar, role badges | Tier 1 (Users Table), Tier 4 (Directory Flow) |
| **F33** | `apps/admin` Digest Curation | `apps/admin/src/app/digests` | Audio script editor, pipeline review | Tier 1 (Digests), Tier 4 (Curation Flow) |
| **F34** | `apps/admin` AI Playground | `apps/admin/src/app/playground`| Test workbench: verify prompt/alert safety | Tier 1 (Playground), Tier 4 (Safety Inspection)|
| **F35** | E2E Test Suite | `tests/e2e/` | Comprehensive 4-tier test harness | All Tiers (Meta Verification) |
| **F36** | Monorepo Quality Gate | Monorepo Root | Typecheck, Biome lint, Next.js build clean | All Tiers (Integration Verification) |

---

## 3. Test Runner Architecture

```
tests/e2e/
├── harness/
│   ├── color-contrast.ts       # WCAG 2.1 AA mathematical relative luminance & contrast engine
│   ├── mock-dom.ts            # High-fidelity DOM, Window, localStorage & MediaQuery emulator
│   ├── test-utils.ts          # JSX rendering, DOM querying, event simulation, assertions
│   └── reporter.ts            # Structured console dashboard and JSON reporting formatters
├── tier1-feature-coverage.test.ts   # Tier 1: Functional coverage (>=5 per feature area)
├── tier2-boundary-corner.test.ts    # Tier 2: Boundary, error handling & stress cases
├── tier3-cross-feature.test.ts      # Tier 3: Pairwise cross-feature combinations
├── tier4-real-world.test.ts         # Tier 4: End-to-end user journeys
└── run-all.ts                       # CLI executable runner orchestrating all tiers
```

### Execution Channels
The test suite offers two complementary execution modes:
1. **Bun Test Runner (`bun test tests/e2e`)**:
   Leverages Bun's native test runner with concurrent execution, snapshots, and standard exit codes.
2. **Dedicated Suite Runner (`bun run tests/e2e/run-all.ts`)**:
   Executes all tiers in sequence, aggregates per-tier and per-feature metrics, prints an ANSI dashboard, and verifies tier pass thresholds.

---

## 4. Pass/Fail Semantics & Tier Thresholds

| Tier | Category | Minimum Tests per Area | Pass Threshold | Semantics |
|------|----------|------------------------|----------------|-----------|
| **Tier 1** | Feature Coverage | $\ge 5$ across 4 areas (Tokens, Theme, Components, Apps) | **100% Pass** | Every functional feature contract must be satisfied. |
| **Tier 2** | Boundary & Corner | $\ge 5$ across 6 areas (Corrupt storage, missing storage, viewports, empty states, long text, rapid toggles) | **100% Pass** | Edge cases and abnormal conditions must fail gracefully without unhandled exceptions. |
| **Tier 3** | Cross-Feature Pairwise | $\ge 1$ per combination pair (Theme x Modal, Theme x Dropdown, Theme x Form, Multi-tab, Nav) | **100% Pass** | Concurrent feature interactions must not cause state leakage or styling collisions. |
| **Tier 4** | Real-World Scenarios | 4 complete end-to-end journeys (Visitor, Subscriber, Operator, Safety) | **100% Pass** | Full multi-step workflows must execute smoothly from entry to completion. |

### Exit Code Protocol:
- **`0`**: All tests passed across all tiers, meeting all quality gates.
- **`1`**: One or more assertions failed or an unhandled exception occurred.
