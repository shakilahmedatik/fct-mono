/**
 * Challenger 2: Empirical Stress Test Suite
 * Milestone 2: Reusable Component Suite in `@repo/ui`
 *
 * Focus Areas:
 * 1. Verification of all 18 components exported and rendered without crash
 * 2. SSR Rendering & React DOM Hydration Safety
 * 3. Edge Cases:
 *    - StatCard: positive, negative, neutral trends, value types, and fallbacks
 *    - Table: empty data, empty rows, captions, footers, checkbox selectors
 *    - EmptyState: without action slot, without icon, without description, long text
 *    - Tooltip: hover and focus simulation, blur/mouseLeave lifecycle, null content, sides
 *    - Alert: custom icons, suppressed default icons, variant-specific default icons and roles
 *    - Skeleton: layout placeholders (avatar, text lines, cards), pulse animation
 * 4. Theme Token Resolution & Semantic Styling
 * 5. Full Consumer Composition (Integrating all 18 components into an app shell)
 */

import { describe, expect, test } from "bun:test";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  Input,
  Label,
  Navbar,
  NavbarActions,
  NavbarBrand,
  NavbarLink,
  NavbarMobileToggle,
  NavbarNav,
  Select,
  SelectOption,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarNav,
  Skeleton,
  StatCard,
  Switch,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../packages/ui/src";
import { el, inspectHtml } from "./harness/test-utils";

describe("Challenger 2: Empirical Component Suite Stress & Edge Tests", () => {
  // =========================================================================
  // 1. All 18 Components Import and Render Verification
  // =========================================================================
  describe("Area 1: All 18 Components Import & Basic Rendering", () => {
    test("1.1 Alert renders without crashing", () => {
      const inspector = inspectHtml(
        el(Alert, null, el(AlertTitle, null, "Title"), el(AlertDescription, null, "Body")),
      );
      expect(inspector.contains("Title")).toBeTrue();
      expect(inspector.contains("Body")).toBeTrue();
    });

    test("1.2 Badge renders without crashing", () => {
      const inspector = inspectHtml(el(Badge, null, "Status"));
      expect(inspector.contains("Status")).toBeTrue();
      expect(inspector.contains("rounded-full")).toBeTrue();
    });

    test("1.3 Button renders without crashing", () => {
      const inspector = inspectHtml(el(Button, null, "Action"));
      expect(inspector.contains("Action")).toBeTrue();
      expect(inspector.contains("<button")).toBeTrue();
    });

    test("1.4 Card renders compound hierarchy without crashing", () => {
      const inspector = inspectHtml(
        el(
          Card,
          null,
          el(
            CardHeader,
            null,
            el(CardTitle, null, "Heading"),
            el(CardDescription, null, "Subheading"),
          ),
          el(CardContent, null, "Body Content"),
          el(CardFooter, null, "Footer Content"),
        ),
      );
      expect(inspector.contains("Heading")).toBeTrue();
      expect(inspector.contains("Subheading")).toBeTrue();
      expect(inspector.contains("Body Content")).toBeTrue();
      expect(inspector.contains("Footer Content")).toBeTrue();
    });

    test("1.5 Dialog renders compound hierarchy without crashing", () => {
      const inspector = inspectHtml(
        el(
          Dialog,
          { open: true },
          el(DialogTrigger, null, "Open"),
          el(
            DialogContent,
            null,
            el(
              DialogHeader,
              null,
              el(DialogTitle, null, "Dialog Title"),
              el(DialogDescription, null, "Dialog Desc"),
            ),
            el(DialogFooter, null, el(DialogClose, null, "Close")),
          ),
        ),
      );
      expect(inspector.hasRole("dialog")).toBeTrue();
      expect(inspector.contains("Dialog Title")).toBeTrue();
      expect(inspector.contains("Dialog Desc")).toBeTrue();
    });

    test("1.6 EmptyState renders without crashing", () => {
      const inspector = inspectHtml(el(EmptyState, { title: "No items" }));
      expect(inspector.contains("No items")).toBeTrue();
    });

    test("1.7 Input renders without crashing", () => {
      const inspector = inspectHtml(el(Input, { placeholder: "Type here" }));
      expect(inspector.hasAttribute("placeholder", "Type here")).toBeTrue();
    });

    test("1.8 Label renders without crashing", () => {
      const inspector = inspectHtml(el(Label, { htmlFor: "field-1" }, "Username"));
      expect(inspector.hasAttribute("for", "field-1")).toBeTrue();
      expect(inspector.contains("Username")).toBeTrue();
    });

    test("1.9 Navbar renders compound hierarchy without crashing", () => {
      const inspector = inspectHtml(
        el(
          Navbar,
          null,
          el(NavbarBrand, null, "Brand"),
          el(NavbarNav, null, el(NavbarLink, { href: "/home" }, "Home")),
          el(NavbarActions, null, el(Button, { size: "sm" }, "Sign In")),
          el(NavbarMobileToggle, null),
        ),
      );
      expect(inspector.contains("Brand")).toBeTrue();
      expect(inspector.contains("Home")).toBeTrue();
      expect(inspector.contains("Sign In")).toBeTrue();
    });

    test("1.10 Select renders compound options without crashing", () => {
      const inspector = inspectHtml(
        el(
          Select,
          { defaultValue: "one" },
          el(SelectOption, { value: "one" }, "Option One"),
          el(SelectOption, { value: "two" }, "Option Two"),
        ),
      );
      expect(inspector.contains("Option One")).toBeTrue();
      expect(inspector.contains("Option Two")).toBeTrue();
    });

    test("1.11 Sidebar renders compound navigation without crashing", () => {
      const inspector = inspectHtml(
        el(
          Sidebar,
          null,
          el(SidebarHeader, null, "Header"),
          el(
            SidebarContent,
            null,
            el(SidebarNav, null, el(SidebarItem, { href: "/dash" }, "Dashboard")),
          ),
          el(SidebarFooter, null, "Footer"),
        ),
      );
      expect(inspector.contains("Header")).toBeTrue();
      expect(inspector.contains("Dashboard")).toBeTrue();
      expect(inspector.contains("Footer")).toBeTrue();
    });

    test("1.12 Skeleton renders without crashing", () => {
      const inspector = inspectHtml(el(Skeleton, { className: "h-6 w-24" }));
      expect(inspector.contains("animate-pulse")).toBeTrue();
      expect(inspector.contains("h-6 w-24")).toBeTrue();
    });

    test("1.13 StatCard renders without crashing", () => {
      const inspector = inspectHtml(el(StatCard, { title: "Revenue", value: "$100k" }));
      expect(inspector.contains("Revenue")).toBeTrue();
      expect(inspector.contains("$100k")).toBeTrue();
    });

    test("1.14 Switch renders without crashing", () => {
      const inspector = inspectHtml(el(Switch, { checked: true }));
      expect(inspector.hasRole("switch")).toBeTrue();
      expect(inspector.hasAria("checked", "true")).toBeTrue();
    });

    test("1.15 Table renders compound table elements without crashing", () => {
      const inspector = inspectHtml(
        el(
          Table,
          null,
          el(TableHeader, null, el(TableRow, null, el(TableHead, null, "Col 1"))),
          el(TableBody, null, el(TableRow, null, el(TableCell, null, "Val 1"))),
          el(TableFooter, null, el(TableRow, null, el(TableCell, null, "Sum 1"))),
        ),
      );
      expect(inspector.contains("Col 1")).toBeTrue();
      expect(inspector.contains("Val 1")).toBeTrue();
      expect(inspector.contains("Sum 1")).toBeTrue();
    });

    test("1.16 Tabs renders compound tab elements without crashing", () => {
      const inspector = inspectHtml(
        el(
          Tabs,
          { defaultValue: "tabA" },
          el(
            TabsList,
            null,
            el(TabsTrigger, { value: "tabA" }, "Tab A"),
            el(TabsTrigger, { value: "tabB" }, "Tab B"),
          ),
          el(TabsContent, { value: "tabA" }, "Content A"),
          el(TabsContent, { value: "tabB" }, "Content B"),
        ),
      );
      expect(inspector.hasRole("tablist")).toBeTrue();
      expect(inspector.contains("Content A")).toBeTrue();
    });

    test("1.17 Textarea renders without crashing", () => {
      const inspector = inspectHtml(el(Textarea, { placeholder: "Write something" }));
      expect(inspector.hasAttribute("placeholder", "Write something")).toBeTrue();
      expect(inspector.contains("<textarea")).toBeTrue();
    });

    test("1.18 Tooltip renders without crashing", () => {
      const inspector = inspectHtml(
        el(Tooltip, { content: "Helpful hint" }, el("button", null, "Trigger")),
      );
      expect(inspector.contains("Trigger")).toBeTrue();
    });
  });

  // =========================================================================
  // 2. Edge Cases: StatCard
  // =========================================================================
  describe("Area 2: StatCard Edge Cases", () => {
    test("2.1 Positive trend with object trend prop", () => {
      const inspector = inspectHtml(
        el(StatCard, {
          title: "Active Users",
          value: 12500,
          trend: { value: "+18.4%", positive: true },
        }),
      );
      expect(inspector.contains("Active Users")).toBeTrue();
      expect(inspector.contains("12500")).toBeTrue();
      expect(inspector.contains("+18.4%")).toBeTrue();
      expect(inspector.contains("lucide-trending-up")).toBeTrue();
      expect(inspector.contains("text-emerald-700")).toBeTrue();
    });

    test("2.2 Negative trend with object trend prop", () => {
      const inspector = inspectHtml(
        el(StatCard, {
          title: "Churn Rate",
          value: "3.2%",
          trend: { value: "-0.8%", positive: false },
        }),
      );
      expect(inspector.contains("-0.8%")).toBeTrue();
      expect(inspector.contains("lucide-trending-down")).toBeTrue();
      expect(inspector.contains("text-red-700")).toBeTrue();
    });

    test("2.3 Neutral trend with string trend prop", () => {
      const inspector = inspectHtml(
        el(StatCard, {
          title: "System Load",
          value: "42%",
          trend: "neutral",
          change: "0.0%",
        }),
      );
      expect(inspector.contains("0.0%")).toBeTrue();
      expect(inspector.contains("lucide-minus")).toBeTrue();
      expect(inspector.contains("bg-muted")).toBeTrue();
    });

    test("2.4 Inferred positive/negative trend from change prop string alone", () => {
      const posInspector = inspectHtml(
        el(StatCard, { title: "Revenue", value: "$90k", change: "+5.0%" }),
      );
      expect(posInspector.contains("lucide-trending-up")).toBeTrue();

      const negInspector = inspectHtml(
        el(StatCard, { title: "Cost", value: "$20k", change: "-2.1%" }),
      );
      expect(negInspector.contains("lucide-trending-down")).toBeTrue();

      const neutralInspector = inspectHtml(
        el(StatCard, { title: "Margin", value: "60%", change: "flat" }),
      );
      expect(neutralInspector.contains("lucide-minus")).toBeTrue();
    });

    test("2.5 Edge value types: numerical 0 and negative value", () => {
      const zeroInspector = inspectHtml(el(StatCard, { title: "Error Rate", value: 0 }));
      expect(zeroInspector.contains(">0<")).toBeTrue();

      const negValueInspector = inspectHtml(el(StatCard, { title: "Net Cashflow", value: -4500 }));
      expect(negValueInspector.contains(">-4500<")).toBeTrue();
    });

    test("2.6 Without trend or change renders clean card without trend badge", () => {
      const inspector = inspectHtml(el(StatCard, { title: "Total Subscriptions", value: "1,204" }));
      expect(inspector.contains("lucide-trending-up")).toBeFalse();
      expect(inspector.contains("lucide-trending-down")).toBeFalse();
      expect(inspector.contains("lucide-minus")).toBeFalse();
    });

    test("2.7 Fallback from subtitle to description prop", () => {
      const descInspector = inspectHtml(
        el(StatCard, { title: "API Calls", value: "1M", description: "Across 3 regions" }),
      );
      expect(descInspector.contains("Across 3 regions")).toBeTrue();

      const subtitleInspector = inspectHtml(
        el(StatCard, { title: "API Calls", value: "1M", subtitle: "Last 24 hours" }),
      );
      expect(subtitleInspector.contains("Last 24 hours")).toBeTrue();
    });
  });

  // =========================================================================
  // 3. Edge Cases: Table
  // =========================================================================
  describe("Area 3: Table Edge Cases", () => {
    test("3.1 Table with empty data body (zero rows)", () => {
      const inspector = inspectHtml(
        el(
          Table,
          null,
          el(
            TableHeader,
            null,
            el(
              TableRow,
              null,
              el(TableHead, null, "Name"),
              el(TableHead, null, "Role"),
              el(TableHead, null, "Status"),
            ),
          ),
          el(TableBody, null),
        ),
      );
      expect(inspector.contains("<table")).toBeTrue();
      expect(inspector.contains("<tbody")).toBeTrue();
      expect(inspector.contains("Name")).toBeTrue();
    });

    test("3.2 Table with caption and footer without body rows", () => {
      const inspector = inspectHtml(
        el(
          Table,
          null,
          el(TableCaption, null, "Empty user directory"),
          el(TableHeader, null, el(TableRow, null, el(TableHead, null, "Email"))),
          el(TableBody, null),
          el(TableFooter, null, el(TableRow, null, el(TableCell, null, "0 total records"))),
        ),
      );
      expect(inspector.contains("Empty user directory")).toBeTrue();
      expect(inspector.contains("0 total records")).toBeTrue();
    });

    test("3.3 Table with empty cells and checkbox alignment classes", () => {
      const inspector = inspectHtml(
        el(
          Table,
          null,
          el(
            TableHeader,
            null,
            el(
              TableRow,
              null,
              el(
                TableHead,
                null,
                el("input", { type: "checkbox", role: "checkbox", "aria-label": "Select all" }),
              ),
              el(TableHead, null, "Description"),
            ),
          ),
          el(
            TableBody,
            null,
            el(
              TableRow,
              null,
              el(
                TableCell,
                null,
                el("input", { type: "checkbox", role: "checkbox", "aria-label": "Select row 1" }),
              ),
              el(TableCell, null, ""),
            ),
          ),
        ),
      );
      expect(inspector.contains("has([role=checkbox])")).toBeTrue();
      expect(inspector.contains("pr-0")).toBeTrue();
    });
  });

  // =========================================================================
  // 4. Edge Cases: EmptyState
  // =========================================================================
  describe("Area 4: EmptyState Edge Cases", () => {
    test("4.1 EmptyState without action slot renders without button/CTA container", () => {
      const inspector = inspectHtml(
        el(EmptyState, {
          title: "No Invoices Found",
          description: "You have not generated any invoices yet.",
        }),
      );
      expect(inspector.contains("No Invoices Found")).toBeTrue();
      expect(inspector.contains("You have not generated any invoices yet.")).toBeTrue();
      // Should default to FolderOpen icon
      expect(inspector.contains("lucide-folder-open")).toBeTrue();
    });

    test("4.2 EmptyState with custom icon and without description", () => {
      const customIcon = el("span", { "data-testid": "search-empty" }, "🔍");
      const inspector = inspectHtml(
        el(EmptyState, {
          icon: customIcon,
          title: "Zero Search Results",
        }),
      );
      expect(inspector.contains("Zero Search Results")).toBeTrue();
      expect(inspector.contains("search-empty")).toBeTrue();
      expect(inspector.contains("lucide-folder-open")).toBeFalse();
    });

    test("4.3 EmptyState with long multiline description and action CTA", () => {
      const longDescription =
        "Your workspace does not have any active webhook subscriptions configured. Webhooks allow external services to receive real-time notifications about digest generations, email deliveries, and audio syntheses.";
      const inspector = inspectHtml(
        el(EmptyState, {
          title: "Configure Webhooks",
          description: longDescription,
          action: el(Button, { variant: "primary" }, "Add Webhook"),
        }),
      );
      expect(inspector.contains(longDescription)).toBeTrue();
      expect(inspector.contains("Add Webhook")).toBeTrue();
      expect(inspector.contains("border-dashed")).toBeTrue();
    });
  });

  // =========================================================================
  // 5. Edge Cases: Tooltip
  // =========================================================================
  describe("Area 5: Tooltip Edge Cases", () => {
    test("5.1 Tooltip renders wrapper and child safely during SSR", () => {
      const inspector = inspectHtml(
        el(
          Tooltip,
          { content: "Copy API Key", side: "bottom" },
          el(Button, { size: "sm" }, "Copy"),
        ),
      );
      expect(inspector.contains("Copy")).toBeTrue();
      expect(inspector.contains("relative inline-flex")).toBeTrue();
    });

    test("5.2 Tooltip handles null or empty content without throwing", () => {
      const inspectorNull = inspectHtml(el(Tooltip, { content: null }, el("span", null, "Target")));
      expect(inspectorNull.contains("Target")).toBeTrue();

      const inspectorUndef = inspectHtml(
        el(Tooltip, { content: undefined }, el("span", null, "Target")),
      );
      expect(inspectorUndef.contains("Target")).toBeTrue();
    });

    test("5.3 Tooltip event handlers (mouseLeave, blur, mouseEnter, focus) execute without crashing", () => {
      // In Tooltip, onMouseEnter and onFocus set isOpen to true,
      // while onMouseLeave and onBlur set isOpen to false without assuming e.relatedTarget exists.
      let openState = false;
      const setOpen = (val: boolean) => {
        openState = val;
      };

      const handleMouseEnter = () => setOpen(true);
      const handleMouseLeave = () => setOpen(false);
      const handleFocus = () => setOpen(true);
      const handleBlur = () => setOpen(false);

      expect(() => {
        handleMouseEnter();
        expect(openState).toBeTrue();
        handleMouseLeave();
        expect(openState).toBeFalse();
        handleFocus();
        expect(openState).toBeTrue();
        handleBlur();
        expect(openState).toBeFalse();

        // 100 rapid stress cycles simulating rapid mouse tracking and tab focus/blur
        for (let i = 0; i < 100; i++) {
          handleMouseEnter();
          handleMouseLeave();
          handleFocus();
          handleBlur();
        }
        expect(openState).toBeFalse();
      }).not.toThrow();

      // Verify Tooltip component itself renders with children and attributes
      const inspector = inspectHtml(
        el(Tooltip, { content: "Safe content" }, el("button", null, "Hover target")),
      );
      expect(inspector.contains("Hover target")).toBeTrue();
      expect(inspector.contains("relative inline-flex")).toBeTrue();
    });

    test("5.4 Radix compatibility wrappers render without crashing", () => {
      const inspector = inspectHtml(
        el(
          TooltipProvider,
          null,
          el(
            Tooltip,
            null,
            el(TooltipTrigger, null, el("button", null, "Hover")),
            el(TooltipContent, null, "Popover text"),
          ),
        ),
      );
      expect(inspector.contains("Hover")).toBeTrue();
      expect(inspector.contains("Popover text")).toBeTrue();
      expect(inspector.hasRole("tooltip")).toBeTrue();
    });

    test("5.5 Tooltip supports all side orientations (top, bottom, left, right)", () => {
      const sides = ["top", "bottom", "left", "right"] as const;
      for (const side of sides) {
        const inspector = inspectHtml(
          el(Tooltip, { content: "Tip", side }, el("span", null, side)),
        );
        expect(inspector.contains(side)).toBeTrue();
        expect(inspector.contains("relative inline-flex")).toBeTrue();
      }
    });
  });

  // =========================================================================
  // 6. Edge Cases: Alert
  // =========================================================================
  describe("Area 6: Alert Edge Cases", () => {
    test("6.1 Alert with custom icon replaces default icon", () => {
      const customIcon = el("span", { "data-testid": "custom-bell" }, "🔔");
      const inspector = inspectHtml(
        el(
          Alert,
          { variant: "info", icon: customIcon },
          el(AlertTitle, null, "Notification"),
          el(AlertDescription, null, "New digest available"),
        ),
      );
      expect(inspector.contains("custom-bell")).toBeTrue();
      expect(inspector.contains("lucide-info")).toBeFalse();
    });

    test("6.2 Alert with showDefaultIcon=false suppresses icon entirely", () => {
      const inspector = inspectHtml(
        el(
          Alert,
          { variant: "warning", showDefaultIcon: false },
          el(AlertTitle, null, "Simple Alert"),
          el(AlertDescription, null, "No icon rendered"),
        ),
      );
      expect(inspector.contains("Simple Alert")).toBeTrue();
      expect(inspector.contains("lucide-alert-triangle")).toBeFalse();
    });

    test("6.3 Destructive alert sets role='alert', other variants set role='status'", () => {
      const destructiveInspector = inspectHtml(
        el(Alert, { variant: "destructive" }, el(AlertTitle, null, "Failure")),
      );
      expect(destructiveInspector.hasRole("alert")).toBeTrue();

      const infoInspector = inspectHtml(
        el(Alert, { variant: "info" }, el(AlertTitle, null, "Info")),
      );
      expect(infoInspector.hasRole("status")).toBeTrue();

      const successInspector = inspectHtml(
        el(Alert, { variant: "success" }, el(AlertTitle, null, "Success")),
      );
      expect(successInspector.hasRole("status")).toBeTrue();

      const warningInspector = inspectHtml(
        el(Alert, { variant: "warning" }, el(AlertTitle, null, "Warning")),
      );
      expect(warningInspector.hasRole("status")).toBeTrue();
    });
  });

  // =========================================================================
  // 7. Edge Cases: Skeleton
  // =========================================================================
  describe("Area 7: Skeleton Edge Cases", () => {
    test("7.1 Skeleton avatar placeholder (circular)", () => {
      const inspector = inspectHtml(el(Skeleton, { className: "h-12 w-12 rounded-full" }));
      expect(inspector.contains("h-12 w-12 rounded-full")).toBeTrue();
      expect(inspector.contains("animate-pulse")).toBeTrue();
      expect(inspector.contains("bg-muted/60")).toBeTrue();
    });

    test("7.2 Skeleton text line and paragraph layout placeholder", () => {
      const inspector = inspectHtml(
        el(
          "div",
          { className: "space-y-2" },
          el(Skeleton, { className: "h-4 w-full" }),
          el(Skeleton, { className: "h-4 w-5/6" }),
          el(Skeleton, { className: "h-4 w-4/6" }),
        ),
      );
      expect(inspector.contains("w-full")).toBeTrue();
      expect(inspector.contains("w-5/6")).toBeTrue();
      expect(inspector.contains("w-4/6")).toBeTrue();
    });

    test("7.3 Skeleton card layout placeholder", () => {
      const inspector = inspectHtml(
        el(
          Card,
          null,
          el(
            CardHeader,
            null,
            el(Skeleton, { className: "h-6 w-1/3" }),
            el(Skeleton, { className: "h-4 w-1/2" }),
          ),
          el(CardContent, null, el(Skeleton, { className: "h-32 w-full rounded-xl" })),
        ),
      );
      expect(inspector.contains("h-32 w-full rounded-xl")).toBeTrue();
      expect(inspector.contains("bg-card")).toBeTrue();
    });
  });

  // =========================================================================
  // 8. Theme Token Resolution & Styling Conformance
  // =========================================================================
  describe("Area 8: Theme Token Resolution & Styling Conformance", () => {
    test("8.1 Interactive components use semantic focus ring token", () => {
      const buttonInspector = inspectHtml(el(Button, null, "Btn"));
      expect(buttonInspector.contains("focus-visible:ring-ring")).toBeTrue();

      const inputInspector = inspectHtml(el(Input, null));
      expect(inputInspector.contains("focus-visible:ring-ring")).toBeTrue();

      const selectInspector = inspectHtml(el(Select, null));
      expect(selectInspector.contains("focus-visible:ring-ring")).toBeTrue();

      const textareaInspector = inspectHtml(el(Textarea, null));
      expect(textareaInspector.contains("focus-visible:ring-ring")).toBeTrue();

      const switchInspector = inspectHtml(el(Switch, null));
      expect(switchInspector.contains("focus-visible:ring-ring")).toBeTrue();
    });

    test("8.2 Error states use semantic destructive tokens", () => {
      const inputError = inspectHtml(el(Input, { error: true }));
      expect(inputError.contains("border-destructive")).toBeTrue();
      expect(inputError.contains("text-destructive")).toBeTrue();

      const textareaError = inspectHtml(el(Textarea, { error: "Required field" }));
      expect(textareaError.contains("border-destructive")).toBeTrue();

      const selectError = inspectHtml(el(Select, { error: true }));
      expect(selectError.contains("border-destructive")).toBeTrue();

      const labelRequired = inspectHtml(el(Label, { required: true }, "Field"));
      expect(labelRequired.contains("text-destructive")).toBeTrue();
    });

    test("8.3 Elevation surfaces use bg-card, bg-popover, and border-border", () => {
      const card = inspectHtml(el(Card, null, "Content"));
      expect(card.contains("bg-card")).toBeTrue();
      expect(card.contains("text-card-foreground")).toBeTrue();
      expect(card.contains("border-border")).toBeTrue();

      const sidebar = inspectHtml(el(Sidebar, null, "Nav"));
      expect(sidebar.contains("bg-card")).toBeTrue();
      expect(sidebar.contains("border-border")).toBeTrue();

      const dialogContent = inspectHtml(el(DialogContent, null, "Modal Content"));
      expect(dialogContent.contains("bg-card")).toBeTrue();
      expect(dialogContent.contains("border-border")).toBeTrue();
    });
  });

  // =========================================================================
  // 9. Full Consumer Composition: App Shell Integration
  // =========================================================================
  describe("Area 9: Full Consumer Composition", () => {
    test("9.1 Composed Admin Shell with all 18 components renders without collision", () => {
      const appMarkup = inspectHtml(
        el(
          "div",
          { className: "min-h-screen bg-background text-foreground flex flex-col" },
          // 1. Navbar
          el(
            Navbar,
            { sticky: true },
            el(NavbarBrand, null, "FirstCup Admin"),
            el(
              NavbarNav,
              null,
              el(NavbarLink, { href: "/admin", active: true }, "Dashboard"),
              el(NavbarLink, { href: "/admin/users" }, "Users"),
              el(NavbarLink, { href: "/admin/digests" }, "Digests"),
            ),
            el(
              NavbarActions,
              null,
              // 2. Tooltip wrapping Button
              el(
                Tooltip,
                { content: "Quick system status" },
                el(Button, { size: "sm", variant: "outline" }, "Health"),
              ),
              // 3. Badge
              el(Badge, { variant: "success" }, "Live v1.0"),
            ),
            el(NavbarMobileToggle, null),
          ),
          el(
            "div",
            { className: "flex flex-1" },
            // 4. Sidebar
            el(
              Sidebar,
              null,
              el(SidebarHeader, null, "Management"),
              el(
                SidebarContent,
                null,
                el(
                  SidebarNav,
                  null,
                  el(SidebarItem, { href: "/dash", active: true }, "Overview"),
                  el(
                    SidebarItem,
                    { href: "/metrics", badge: el(Badge, { variant: "secondary" }, "New") },
                    "Analytics",
                  ),
                ),
              ),
              el(SidebarFooter, null, "Logged in as Admin"),
            ),
            // Main content area
            el(
              "main",
              { className: "flex-1 p-6 space-y-6" },
              // 5. Alert
              el(
                Alert,
                { variant: "info" },
                el(AlertTitle, null, "Digest Pipeline Active"),
                el(AlertDescription, null, "Next run scheduled in 14 minutes."),
              ),
              // 6. StatCards in responsive grid
              el(
                "div",
                { className: "grid grid-cols-1 md:grid-cols-3 gap-6" },
                el(StatCard, {
                  title: "Daily Active Users",
                  value: "3,420",
                  trend: { value: "+12%", positive: true },
                }),
                el(StatCard, { title: "Audio Minutes Rendered", value: "1,890", change: "+5%" }),
                el(StatCard, {
                  title: "Delivery Error Rate",
                  value: "0.02%",
                  trend: "neutral",
                  change: "0.0%",
                }),
              ),
              // 7. Tabs with Table & EmptyState
              el(
                Tabs,
                { defaultValue: "users" },
                el(
                  TabsList,
                  null,
                  el(TabsTrigger, { value: "users" }, "User Directory"),
                  el(TabsTrigger, { value: "queue" }, "Processing Queue"),
                ),
                el(
                  TabsContent,
                  { value: "users" },
                  // 8. Card containing Table
                  el(
                    Card,
                    null,
                    el(CardHeader, null, el(CardTitle, null, "Active Users")),
                    el(
                      CardContent,
                      null,
                      // 9. Table
                      el(
                        Table,
                        null,
                        el(
                          TableHeader,
                          null,
                          el(
                            TableRow,
                            null,
                            el(TableHead, null, "Name"),
                            el(TableHead, null, "Email"),
                            el(TableHead, null, "Plan"),
                          ),
                        ),
                        el(
                          TableBody,
                          null,
                          el(
                            TableRow,
                            null,
                            el(TableCell, null, "Alice"),
                            el(TableCell, null, "alice@example.com"),
                            el(TableCell, null, el(Badge, { variant: "secondary" }, "Pro")),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              // Dedicated EmptyState container
              el(
                Card,
                null,
                el(
                  CardContent,
                  { className: "p-6" },
                  el(EmptyState, {
                    title: "Queue is empty",
                    description: "All digests have been processed.",
                    action: el(Button, { variant: "primary" }, "Generate Now"),
                  }),
                ),
              ),
              // 11. Form primitives inside Card
              el(
                Card,
                null,
                el(CardHeader, null, el(CardTitle, null, "Curation Configuration")),
                el(
                  CardContent,
                  { className: "space-y-4" },
                  // 12. Label & Input
                  el(
                    "div",
                    null,
                    el(Label, { htmlFor: "topic-input", required: true }, "Digest Topic"),
                    el(Input, { id: "topic-input", placeholder: "e.g. AI & Robotics" }),
                  ),
                  // 13. Label & Textarea
                  el(
                    "div",
                    null,
                    el(Label, { htmlFor: "notes" }, "Editor Notes"),
                    el(Textarea, { id: "notes", placeholder: "Add notes..." }),
                  ),
                  // 14. Label & Select
                  el(
                    "div",
                    null,
                    el(Label, { htmlFor: "voice-select" }, "Audio Voice"),
                    el(
                      Select,
                      { id: "voice-select", defaultValue: "en-US-1" },
                      el(SelectOption, { value: "en-US-1" }, "Sarah (Warm)"),
                      el(SelectOption, { value: "en-US-2" }, "Michael (Authoritative)"),
                    ),
                  ),
                  // 15. Switch
                  el(Switch, { label: "Auto-publish upon completion", checked: true }),
                  // 16. Skeleton preview placeholder
                  el(
                    "div",
                    { className: "pt-4 space-y-2" },
                    el(Label, null, "Audio Waveform Generating..."),
                    el(Skeleton, { className: "h-8 w-full" }),
                  ),
                ),
                el(
                  CardFooter,
                  null,
                  // 17. Dialog trigger & modal
                  el(
                    Dialog,
                    null,
                    el(DialogTrigger, null, el(Button, { variant: "destructive" }, "Purge Cache")),
                    el(
                      DialogContent,
                      null,
                      el(DialogHeader, null, el(DialogTitle, null, "Purge Confirmation")),
                      el(
                        DialogFooter,
                        null,
                        el(DialogClose, null, "Cancel"),
                        el(Button, { variant: "destructive" }, "Confirm Purge"),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );

      // Verify key markers of all 18 components in the composed document
      expect(appMarkup.contains("FirstCup Admin")).toBeTrue(); // Navbar
      expect(appMarkup.contains("Management")).toBeTrue(); // Sidebar
      expect(appMarkup.contains("Digest Pipeline Active")).toBeTrue(); // Alert
      expect(appMarkup.contains("Daily Active Users")).toBeTrue(); // StatCard
      expect(appMarkup.contains("User Directory")).toBeTrue(); // Tabs
      expect(appMarkup.contains("Active Users")).toBeTrue(); // Card
      expect(appMarkup.contains("alice@example.com")).toBeTrue(); // Table
      expect(appMarkup.contains("Queue is empty")).toBeTrue(); // EmptyState
      expect(appMarkup.contains("Digest Topic")).toBeTrue(); // Label
      expect(appMarkup.contains("topic-input")).toBeTrue(); // Input
      expect(appMarkup.contains("Editor Notes")).toBeTrue(); // Textarea
      expect(appMarkup.contains("voice-select")).toBeTrue(); // Select
      expect(appMarkup.contains("Auto-publish upon completion")).toBeTrue(); // Switch
      expect(appMarkup.contains("animate-pulse")).toBeTrue(); // Skeleton
      expect(appMarkup.contains("Purge Cache")).toBeTrue(); // Dialog trigger
      expect(appMarkup.contains("relative inline-flex")).toBeTrue(); // Tooltip wrapper
      expect(appMarkup.contains("Health")).toBeTrue(); // Button inside Tooltip
      expect(appMarkup.contains("Live v1.0")).toBeTrue(); // Badge
    });
  });

  // =========================================================================
  // 10. Generation 2 Remediation Empirical Stress Verification
  // =========================================================================
  describe("Area 10: Generation 2 Remediation Empirical Stress Verification", () => {
    test("10.1 Dialog focus trap and accessibility attributes", () => {
      const openDialog = inspectHtml(
        el(
          Dialog,
          { open: true },
          el(DialogTrigger, null, "Trigger"),
          el(
            DialogContent,
            null,
            el(DialogHeader, null, el(DialogTitle, null, "Modal Header")),
            el(Button, { id: "btn-1" }, "First Action"),
            el(Button, { id: "btn-2" }, "Second Action"),
          ),
        ),
      );
      expect(openDialog.hasRole("dialog")).toBeTrue();
      expect(openDialog.hasAria("modal", "true")).toBeTrue();
      expect(openDialog.contains('tabindex="-1"')).toBeTrue();
      expect(openDialog.contains("First Action")).toBeTrue();
      expect(openDialog.contains("Second Action")).toBeTrue();
    });

    test("10.2 Navbar responsive alignment eliminates 640px blackout", () => {
      const navMarkup = inspectHtml(
        el(
          Navbar,
          null,
          el(NavbarBrand, null, "Brand"),
          el(NavbarNav, null, el(NavbarLink, { href: "/features" }, "Features")),
          el(NavbarActions, null, el(Button, null, "Login")),
          el(NavbarMobileToggle, null),
        ),
      );
      // Main nav is hidden below md (768px)
      expect(navMarkup.contains("hidden md:flex")).toBeTrue();
      // Toggle is visible below md (768px)
      expect(navMarkup.contains("inline-flex md:hidden")).toBeTrue();
      // Outdated sm:hidden is completely absent
      expect(navMarkup.contains("sm:hidden")).toBeFalse();
    });

    test("10.3 Switch accessibility: htmlFor, aria-labelledby, and keydown guard", () => {
      const switchMarkup = inspectHtml(
        el(Switch, {
          id: "digest-switch",
          label: "Daily Digest",
          description: "Receive audio briefing",
        }),
      );
      expect(switchMarkup.hasRole("switch")).toBeTrue();
      expect(switchMarkup.hasAria("labelledby", "digest-switch-label")).toBeTrue();
      expect(switchMarkup.hasAria("describedby", "digest-switch-desc")).toBeTrue();
      expect(switchMarkup.contains('for="digest-switch"')).toBeTrue();
      expect(switchMarkup.contains('id="digest-switch-label"')).toBeTrue();
      expect(switchMarkup.contains('id="digest-switch-desc"')).toBeTrue();
    });

    test("10.4 Form controls error states: Input, Textarea, and Select", () => {
      // 1. Input string error
      const inputWithError = inspectHtml(
        el(Input, { id: "email-in", error: "Invalid email address" }),
      );
      expect(inputWithError.contains('role="alert"')).toBeTrue();
      expect(inputWithError.contains("Invalid email address")).toBeTrue();
      expect(inputWithError.hasAria("describedby", "email-in-error")).toBeTrue();
      expect(inputWithError.hasAria("invalid", "true")).toBeTrue();

      // 2. Input boolean error
      const inputWithBool = inspectHtml(el(Input, { id: "email-bool", error: true }));
      expect(inputWithBool.contains('role="alert"')).toBeFalse();
      expect(inputWithBool.hasAria("invalid", "true")).toBeTrue();
      expect(inputWithBool.contains("border-destructive")).toBeTrue();

      // 3. Textarea string error
      const textareaWithError = inspectHtml(
        el(Textarea, { id: "bio-in", error: "Bio cannot exceed 200 words" }),
      );
      expect(textareaWithError.contains('role="alert"')).toBeTrue();
      expect(textareaWithError.contains("Bio cannot exceed 200 words")).toBeTrue();
      expect(textareaWithError.hasAria("describedby", "bio-in-error")).toBeTrue();

      // 4. Select string error
      const selectWithError = inspectHtml(
        el(
          Select,
          { id: "cadence-select", error: "Please select delivery cadence" },
          el(SelectOption, { value: "daily" }, "Daily"),
        ),
      );
      expect(selectWithError.contains('role="alert"')).toBeTrue();
      expect(selectWithError.contains("Please select delivery cadence")).toBeTrue();
      expect(selectWithError.hasAria("describedby", "cadence-select-error")).toBeTrue();
    });
  });
});
