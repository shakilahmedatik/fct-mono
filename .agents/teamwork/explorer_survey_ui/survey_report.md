# Comprehensive UI Architecture & Component Catalog Survey Report

**Explorer**: Explorer 2 (`survey_ui`)  
**Target Package**: `@repo/ui` (`/Users/shakilahmedatik/Projects/firstcup-monorepo/packages/ui`)  
**Ecosystem**: Next.js 16.4.0 (Turbopack / App Router), React 19.3.0, Tailwind CSS v4.3.3, Bun 1.3.13  
**Date**: 2026-10-14  

---

## Executive Summary

The `@repo/ui` package currently contains only **4 basic UI components** (`Badge`, `Button`, `Card`, and `Input`) and a helper `cn` function. 

While the package is referenced across all three frontend applications (`apps/web`, `apps/console`, and `apps/admin`), the majority of UI patterns (Sidebars, Navbars, Stat/Metric Cards, Data Tables, Tabs, Selects, Textareas, Alert banners, and Modal dialogs) are **hand-rolled in each individual app using raw HTML elements with duplicated Tailwind utility classes**, or even crude browser fallbacks (e.g., `window.prompt` in `apps/admin`).

Furthermore, there is a fundamental architectural gap in the theme and token layer:
1. **Tailwind CSS v4 Token Mapping Gap**: `@repo/ui/src/styles.css` defines shadcn-style CSS custom properties (`--background`, `--card`, `--border`, etc.) inside `@layer base`, but Tailwind CSS v4 requires an `@theme` block or `@theme inline` block to generate utility classes like `bg-background`, `border-border`, and `bg-card`. Without an `@theme` block in `@repo/ui/styles.css`, utility classes may fail to resolve or inherit custom values properly.
2. **Hardcoded Dark Theme & Missing Theme Provider**: All three applications hardcode `<html lang="en" className="dark">` in `RootLayout`. There is no theme provider, no theme toggle mechanism, no `localStorage` persistence, and no system preference detection. Switching to light mode breaks contrast because semantic color values and interactive focus rings were authored solely for dark backgrounds.

To satisfy **R1** and **R2** of `ORIGINAL_REQUEST.md`, `@repo/ui` must be expanded from 4 basic components into a comprehensive, production-grade 18-component design system suite with first-class light/dark theme support and accessible interactive states.

---

## Section 1: Package Structure, Dependencies, and Toolchain

### 1.1 Filesystem Structure
```
packages/ui/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── styles.css
    ├── lib/
    │   └── utils.ts
    └── components/
        ├── badge.tsx
        ├── button.tsx
        ├── card.tsx
        └── input.tsx
```

### 1.2 Package Manifest (`package.json`) Analysis
- **Name**: `@repo/ui`
- **Main & Types**: `./src/index.ts`
- **Exports**:
  - `"."`: `./src/index.ts`
  - `"./styles.css"`: `./src/styles.css`
- **Dependencies**:
  - `class-variance-authority`: `^0.7.1` (Present — used for CVA variant mapping)
  - `clsx`: `^2.1.1` (Present — class combining)
  - `lucide-react`: `^1.53.0` (Present — iconography)
  - `tailwind-merge`: `^3.5.0` (Present — conflict resolution in `cn()`)
- **Peer Dependencies**:
  - `react`: `^19.0.0`
  - `react-dom`: `^19.0.0`
- **Dev Dependencies**:
  - `@repo/config-ts`: `workspace:*`
  - `@types/react`: `^19.3.0`
  - `@types/react-dom`: `^19.3.0`
  - `typescript`: `^5.8.2`

### 1.3 Missing Dependencies & React 19 Considerations
- Neither `@radix-ui` nor `next-themes` is currently installed in `@repo/ui` or in the root workspace.
- **React 19 Compatibility Note**: The monorepo runs React 19.3.0. Some older Radix UI packages have historically encountered peer-dependency friction with React 19. If Radix UI primitives are added, they must be tested with React 19, or accessible, high-performance zero-dependency primitives (using standard HTML5 semantic elements such as `<dialog>`, ARIA attributes, and React 19 forwardRef/hooks) should be implemented to ensure zero build errors and zero version pinning headaches.
- For Theme Management, a zero-dependency custom `ThemeProvider` with `useTheme` hook is ideal: it supports `light`, `dark`, and `system` modes, prevents Flash of Unstyled Content (FOUC) via a small inline script tag, synchronizes `localStorage`, and binds `window.matchMedia('(prefers-color-scheme: dark)')` without external dependencies.

---

## Section 2: Catalog of Existing Components in `@repo/ui`

| Component | File Path | Variants / Sizes | Sub-Components | Quality / Accessibility Assessment |
|---|---|---|---|---|
| **`Badge`** | `src/components/badge.tsx` | Variants: `default`, `secondary`, `success`, `warning`, `destructive`, `outline` | None | **Moderate**. Clean CVA implementation, renders a `<div>`. Lacks keyboard focusability or active states when used as an interactive filter or clickable tag. Light mode contrast for `success` (`text-emerald-500`) and `warning` (`text-amber-500`) is substandard on white cards (fails WCAG AA 4.5:1). |
| **`Button`** | `src/components/button.tsx` | Variants: `default`, `primary`, `secondary`, `outline`, `ghost`, `destructive`<br/>Sizes: `sm`, `md`, `lg`, `icon` | None | **High**. Proper `React.forwardRef<HTMLButtonElement, ButtonProps>`. Has `isLoading` prop with spinning SVG, `disabled:pointer-events-none disabled:opacity-50`, `active:scale-[0.98]`, and `focus-visible:ring-2`. Needs standard ring color tokens that work in both light and dark modes. |
| **`Card`** | `src/components/card.tsx` | No CVA variants (single default style) | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | **Moderate**. Clean forwardRef compound pattern. Background is `bg-card` with `backdrop-blur-sm shadow-sm`. Missing interactive hoverable/clickable variant (`Card hover:border-accent/40 cursor-pointer`), which is manually duplicated in `apps/web/src/app/blog/page.tsx` and `apps/admin/src/app/playground`. |
| **`Input`** | `src/components/input.tsx` | No variants | None | **Moderate**. Forwards ref to `<input>`. Has focus-visible ring (`focus-visible:ring-2 focus-visible:ring-foreground`). Lacks: error state (`aria-invalid`), icon slots (leading/trailing adornments), helper text, and integrated Label linkage. |

### Utility Function (`src/lib/utils.ts`)
```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```
Standard shadcn-style `cn` helper. Clean and correct.

---

## Section 3: Token and Styling Architecture Analysis (`styles.css`)

### 3.1 Current Token Definitions
`packages/ui/src/styles.css` defines variables in HSL triplets:
- `:root` (Light Mode):
  - `--background`: `0 0% 100%` (pure white)
  - `--foreground`: `240 10% 3.9%` (near black)
  - `--card`: `0 0% 100%`
  - `--primary`: `240 5.9% 10%`
  - `--accent`: `142 71% 45%` (emerald green)
  - `--border`: `240 5.9% 90%`
  - `--ring`: `240 5.9% 10%`
- `.dark` (Dark Mode):
  - `--background`: `240 10% 3.9%`
  - `--foreground`: `0 0% 98%`
  - `--card`: `240 10% 6.5%`
  - `--accent`: `142 71% 45%`
  - `--border`: `240 3.7% 18%`
  - `--ring`: `240 4.9% 83.9%`

### 3.2 The Tailwind CSS v4 Defect
In Tailwind CSS v4 (`@tailwindcss/postcss`), utility classes are generated from `@theme` declarations. Currently, `globals.css` in all three apps simply has:
```css
@import "tailwindcss";
@import "@repo/ui/styles.css";
```
Because `@repo/ui/styles.css` only has `@layer base { :root { ... } .dark { ... } }` and lacks an `@theme` block, classes like `bg-card`, `text-card-foreground`, `border-border`, and `bg-background` are not recognized as semantic theme utilities by default Tailwind v4 compiler rules unless explicitly mapped!

### 3.3 Required `@theme` Block for Tailwind v4
To guarantee theme compilation across all apps, `@repo/ui/src/styles.css` must include:
```css
@theme {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));

  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}
```

---

## Section 4: Gap Analysis Across Monorepo Applications

### 4.1 Application Usage Audit

| Application | Existing `@repo/ui` Usage | Raw / Inline Hand-Rolled Patterns Found in App Code | Missing UI Component Needed |
|---|---|---|---|
| **`apps/web`** | `Badge`, `Button`, `Card` | - Sticky navigation header in `layout.tsx`<br/>- Footer in `layout.tsx`<br/>- Raw `<textarea>` in `contact/page.tsx`<br/>- Hand-rolled form labels `<label>`<br/>- Audio player mockup with custom progress bar | `Navbar`, `Footer`, `Textarea`, `Label`, `Slider`/`Progress` |
| **`apps/console`** | `Badge`, `Button`, `Card`, `Input` | - Fixed sidebar navigation in `layout.tsx`<br/>- Hand-styled error alert banner in `(auth)/login/page.tsx`<br/>- Topic selection toggle pills in `preferences/page.tsx`<br/>- Audio playback controls with play/pause state<br/>- Feedback thumbs up/down buttons | `Sidebar`, `Alert`, `Switch`/`Toggle`, `Tooltip`, `StatCard` |
| **`apps/admin`** | `Badge`, `Button`, `Card` | - Admin sidebar in `layout.tsx`<br/>- 4 KPI stat tiles in `dashboard/page.tsx`<br/>- Raw HTML `<table>` in `users/page.tsx`<br/>- Hand-rolled tab bar (`data`, `logs`, `output`) in `playground/page.tsx`<br/>- Raw `<select>` dropdowns in `ParametersPanel.tsx`, `Header.tsx`<br/>- Range sliders and toggle buttons in `SourcesPanel.tsx`<br/>- `window.prompt` in `SourcesPanel.tsx` for adding RSS URLs<br/>- BullMQ status drawer and payload viewer | `Sidebar`, `StatCard`, `Table` (DataTable suite), `Tabs`, `Select`, `Modal`/`Dialog`, `EmptyState`, `Alert` |

---

## Section 5: Cross-Reference against Requirements R1 & R2

### Category Breakdown & Gap Matrix

| Category | Required Components (R1 & R2) | Existing in `@repo/ui` | Status | Exact Gap & Action Required |
|---|---|---|---|---|
| **Foundations & Theme** | `ThemeProvider`, `ThemeToggle`, Design Tokens, Focus Rings | ❌ None | **Critical Gap** | Implement client-side `ThemeProvider` supporting `light`, `dark`, `system` with zero FOUC script. Create `ThemeToggle` component with Sun/Moon/Laptop icons. |
| **Navigation** | `Navbar`, `Sidebar`, `Nav` items / links, `MobileNav` | ❌ None | **Critical Gap** | Currently duplicated across `apps/web/layout.tsx`, `apps/console/layout.tsx`, and `apps/admin/layout.tsx`. Build reusable `Navbar` and `Sidebar` compound components. |
| **Form Controls** | `Input`, `Textarea`, `Select` / `Dropdown`, `Switch` / `Toggle`, `Label` | ⚠️ Only `Input` | **High Gap** | Add `Textarea` (with resize & error states), `Select` (accessible select dropdown), `Switch` (accessible toggle), and `Label` (linked to input IDs). |
| **Feedback Elements** | `Badge`, `Alert`, `Modal` / `Dialog`, `Tooltip` | ⚠️ Only `Badge` | **High Gap** | Add `Alert` (info, success, warning, destructive), `Dialog`/`Modal` (accessible dialog with backdrop, title, description, actions), and `Tooltip`. |
| **Structure & Data** | `Card`, `StatCard`, `Table` (Data Table), `Tabs`, `EmptyState`, `Skeleton` | ⚠️ Only `Card` | **High Gap** | Add `StatCard` (value, trend, subtitle, icon), `Table` suite (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`), `Tabs` (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`), `EmptyState`, and `Skeleton`. |
| **Interactive States** | Hover, Active, Focus-Visible, Disabled across themes | ⚠️ Partial in `Button`/`Input` | **Medium Gap** | Ensure all controls have uniform `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none`, accessible color contrast in both light & dark modes. |

---

## Section 6: Comprehensive Component Specifications & Export Contracts

Below are the exact component specifications, props interfaces, and compound patterns recommended for the `@repo/ui` revamp.

### 6.1 Foundations & Theme
#### `ThemeProvider` & `useTheme` (`src/components/theme-provider.tsx`)
- **Props**: `children: React.ReactNode`, `defaultTheme?: "light" | "dark" | "system"`, `storageKey?: string`, `enableSystem?: boolean`.
- **Context API**: `theme: "light" | "dark" | "system"`, `resolvedTheme: "light" | "dark"`, `setTheme: (theme: "light" | "dark" | "system") => void`.
- **FOUC Prevention**: Inline `<script>` execution or strict hydration sync that checks `localStorage` or `window.matchMedia` and toggles `.dark` on `document.documentElement`.

#### `ThemeToggle` (`src/components/theme-toggle.tsx`)
- **Props**: `className?: string`, `variant?: "outline" | "ghost" | "default"`.
- **Behavior**: Cycles between Light (`Sun`), Dark (`Moon`), and System (`Laptop`/`Monitor`), or opens a clean dropdown.

---

### 6.2 Navigation Suite
#### `Navbar` (`src/components/navbar.tsx`)
- Compound: `Navbar`, `NavbarBrand`, `NavbarNav`, `NavbarLink`, `NavbarActions`, `NavbarMobileToggle`.
- Features: Sticky positioning, backdrop blur, responsive hamburger/mobile menu toggle.

#### `Sidebar` (`src/components/sidebar.tsx`)
- Compound: `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarNav`, `SidebarItem`, `SidebarFooter`.
- Features: Active state indicator (`bg-accent/15 text-accent font-semibold`), icon slot, badge slot, collapsed icon-only mode support.

---

### 6.3 Form Controls Suite
#### `Input` (`src/components/input.tsx`)
- **Props**: `InputProps extends React.InputHTMLAttributes<HTMLInputElement>` with `error?: boolean | string`, `leftIcon?: React.ReactNode`, `rightIcon?: React.ReactNode`.
- Features: Standardized `h-10`, rounded borders, focus ring, placeholder muted colors, disabled states.

#### `Textarea` (`src/components/textarea.tsx`)
- **Props**: `TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>` with `error?: boolean | string`.
- Features: Auto/manual resize, focus-visible ring, error outline.

#### `Label` (`src/components/label.tsx`)
- **Props**: `LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement>` with `required?: boolean`.
- Features: Accessible text styling (`text-xs font-semibold text-muted-foreground uppercase tracking-wider`).

#### `Select` (`src/components/select.tsx`)
- Compound or single: `Select`, `SelectOption` or styled native select with custom chevron.
- Features: Consistent with `Input` height (`h-10`), dark/light theme options styling, focus ring.

#### `Switch` (`src/components/switch.tsx`)
- **Props**: `checked?: boolean`, `onCheckedChange?: (checked: boolean) => void`, `disabled?: boolean`, `label?: string`.
- Features: Accessible toggle pill (`role="switch"`, `aria-checked`), smooth transition thumb animation, keyboard toggle (`Space`/`Enter`).

---

### 6.4 Feedback Elements Suite
#### `Badge` (`src/components/badge.tsx`)
- Variants: `default`, `secondary`, `success`, `warning`, `destructive`, `outline`.
- High-contrast colors in both light (`bg-emerald-100 text-emerald-800 border-emerald-200`) and dark (`bg-emerald-500/15 text-emerald-400 border-emerald-500/20`).

#### `Alert` (`src/components/alert.tsx`)
- Compound: `Alert`, `AlertTitle`, `AlertDescription`.
- Variants: `default`, `info`, `success`, `warning`, `destructive`.
- Features: Icon integration (`AlertCircle`, `CheckCircle2`, `Info`), dismissible button support.

#### `Dialog` / `Modal` (`src/components/dialog.tsx`)
- Compound: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`.
- Features: Backdrop overlay with blur, ESC key dismiss, focus trap, accessible ARIA attributes (`role="dialog"`, `aria-modal="true"`).

#### `Tooltip` (`src/components/tooltip.tsx`)
- Simple declarative component: `<Tooltip content="Helper text"><button>...</button></Tooltip>`.
- Features: Hover & keyboard focus visibility, floating card styling, arrow pointer.

---

### 6.5 Structure & Data Suite
#### `Card` (`src/components/card.tsx`)
- Sub-components: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- Variants: `default`, `interactive` (hover border, shadow elevate, cursor-pointer), `outline`.

#### `StatCard` (`src/components/stat-card.tsx`)
- **Props**: `title: string`, `value: string | number`, `subtitle?: string`, `icon?: React.ReactNode`, `trend?: { value: string; positive?: boolean }`, `className?: string`.
- Features: Formatted large numeric display (`text-3xl font-extrabold`), trend pill with arrow icons, card surface elevation.

#### `Table` (`src/components/table.tsx`)
- Compound: `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`.
- Features: Overflow scroll wrapper, sticky header support, zebra row hover transitions (`hover:bg-muted/40`), subtle borders.

#### `Tabs` (`src/components/tabs.tsx`)
- Compound: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.
- Features: Controlled or uncontrolled `value`/`defaultValue`, keyboard arrow navigation, active indicator pill or border underline.

#### `EmptyState` (`src/components/empty-state.tsx`)
- **Props**: `icon?: React.ReactNode`, `title: string`, `description?: string`, `action?: React.ReactNode`.
- Features: Centered graphic, muted copy, primary call-to-action button slot.

#### `Skeleton` (`src/components/skeleton.tsx`)
- **Props**: `className?: string`.
- Features: Shimmer/pulse animation (`animate-pulse bg-muted rounded-md`), customizable dimensions for text lines, avatar circles, and card blocks.

---

### 6.6 Proposed Public Export Contract (`packages/ui/src/index.ts`)
```ts
// Theme & Foundations
export * from "./components/theme-provider";
export * from "./components/theme-toggle";

// Navigation
export * from "./components/navbar";
export * from "./components/sidebar";

// Form Controls
export * from "./components/input";
export * from "./components/textarea";
export * from "./components/label";
export * from "./components/select";
export * from "./components/switch";

// Feedback Elements
export * from "./components/badge";
export * from "./components/alert";
export * from "./components/dialog";
export * from "./components/tooltip";

// Structure & Data
export * from "./components/card";
export * from "./components/stat-card";
export * from "./components/table";
export * from "./components/tabs";
export * from "./components/empty-state";
export * from "./components/skeleton";

// Utilities
export * from "./lib/utils";
```

---

## Section 7: Key Recommendations for Downstream Implementation

1. **Fix Tailwind v4 Token Integration First**: Update `packages/ui/src/styles.css` with an `@theme` block mapping all semantic CSS variables (`--color-background`, `--color-card`, etc.). This unblocks all Tailwind utilities across all apps.
2. **Implement ThemeProvider & ThemeToggle with Zero FOUC**: Create a clean, zero-dependency `ThemeProvider` in `@repo/ui` that synchronizes `<html class="dark">` and `localStorage`, and wrap the `RootLayout` of all three apps.
3. **Build the Reusable Primitive Suite**: Implement the missing 14 components in `@repo/ui` adhering strictly to standard HTML5/ARIA patterns and React 19 forwardRef patterns.
4. **Refactor Apps Progressively**:
   - `apps/web`: Consume `Navbar`, `Card`, `Badge`, `Button`, `Textarea`, `Label`, `ThemeToggle`.
   - `apps/console`: Consume `Sidebar`, `Card`, `Badge`, `Button`, `Input`, `Alert`, `ThemeToggle`.
   - `apps/admin`: Consume `Sidebar`, `StatCard`, `Table`, `Tabs`, `Select`, `Dialog`, `Alert`, `EmptyState`, `ThemeToggle`.
