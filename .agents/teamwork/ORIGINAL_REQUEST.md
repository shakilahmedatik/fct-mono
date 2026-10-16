# Original User Request

## 2026-10-14T08:31:00Z

Build a comprehensive, production-grade design system in `@repo/ui` with robust light and dark theme support, pristine visual hierarchy, and revamp the front-end applications (`apps/web`, `apps/console`, `apps/admin`) across the FirstCup monorepo to fully integrate the new design language.

Working directory: `/Users/shakilahmedatik/Projects/firstcup-monorepo`
Integrity mode: development

## Requirements

### R1. Design System & Theme Foundations (`@repo/ui`)
Establish design tokens (semantic color palettes, surface elevations, typography scales, spacing, border radii, shadows, and focus rings) with full support for light and dark themes. Provide a dynamic, persistent theme provider and toggle mechanism that respects system preference and prevents flash of unstyled content (FOUC).

### R2. Reusable Component Suite (`@repo/ui`)
Implement an accessible, cohesive suite of UI primitive and pattern components in `@repo/ui`, including navigation bars, sidebars, buttons, form controls (inputs, textareas, selects, toggles), feedback elements (badges, alerts, modals/dialogs, tooltips), cards, data tables, and key metric/stat tiles. Ensure all components define consistent hover, active, focus-visible, and disabled states across both themes.

### R3. Application Overhaul (`apps/web`, `apps/console`, `apps/admin`)
Refactor and redesign all pages and layouts across all three front-end applications to consume the new design system:
- `apps/web`: Marketing landing page, pricing, blog, blog posts, and contact pages.
- `apps/console`: User console shell, dashboard, preference settings, billing, and authentication pages.
- `apps/admin`: Operational administration shell, dashboard, user directory, digest curation, and playground testing pages.

### R4. Visual Hierarchy, Ergonomics & Quality Standards
Ensure intentional visual hierarchy across every screen: clear typographic scale, unmistakable call-to-actions, purposeful grouping and whitespace, and balanced surface contrast. Validate responsive behavior across mobile, tablet, and desktop viewports.

## Acceptance Criteria

### Design Tokens & Theme Switching
- [ ] Theme toggler dynamically switches between light, dark, and system themes with persistent user preference and zero FOUC.
- [ ] Text and interactive elements meet WCAG AA contrast standards (minimum 4.5:1 for body copy, 3:1 for large headings and UI borders/controls) in both light and dark modes.
- [ ] Centralized styles and tokens in `@repo/ui` are used across all apps rather than disparate inline custom color values.

### UI Component Completeness
- [ ] `@repo/ui` exports a full suite of primitives (Button, Badge, Card, Input, Textarea, Dialog/Modal, Dropdown/Select, Table, StatCard, Nav/Sidebar).
- [ ] All interactive elements feature accessible focus outlines (`focus-visible:ring-*`), active states, and keyboard navigation support.

### Application Coverage & Integration
- [ ] `apps/web` displays a polished, high-converting tech aesthetic with cohesive hero, feature grids, pricing tiers, blog layouts, and footers.
- [ ] `apps/console` displays an intuitive dashboard experience with structured navigation, readable metric cards, clean preference forms, and account settings.
- [ ] `apps/admin` delivers clear administrative workflows with readable data tables, filter bars, status chips, and inspector views.

### Build & Integrity Verification
- [ ] Typecheck passes across all packages and apps with zero TypeScript errors (`turbo typecheck` or workspace `tsc --noEmit`).
- [ ] Biome lint checks pass with zero syntax or lint errors on all created and modified files.
- [ ] Next.js builds succeed for `apps/web`, `apps/console`, and `apps/admin` without missing imports or rendering crashes.

## 2026-10-14T15:41:35Z

The server has restarted and your quota has reset. Please resume execution from the current state in PROJECT.md: Milestone 1, 2, and 3 are complete and verified. Please continue with Milestone 4 (apps/console revamp), Milestone 5 (apps/admin revamp), and Milestone 6 (Final integration and verification).
