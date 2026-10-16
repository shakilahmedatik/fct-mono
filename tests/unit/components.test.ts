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
import { el, inspectHtml } from "../e2e/harness/test-utils";

describe("@repo/ui component suite unit tests", () => {
  // =========================================================================
  // 1. Button
  // =========================================================================
  describe("Button", () => {
    test("renders all variants with proper classes and focus ring", () => {
      const variants = [
        "default",
        "primary",
        "secondary",
        "outline",
        "ghost",
        "destructive",
        "link",
      ] as const;

      for (const variant of variants) {
        const inspector = inspectHtml(el(Button, { variant }, "Click"));
        expect(inspector.contains("focus-visible:ring-2")).toBeTrue();
        expect(inspector.contains("focus-visible:ring-ring")).toBeTrue();
        expect(inspector.contains("active:scale-[0.98]")).toBeTrue();
      }
    });

    test("renders all sizes", () => {
      expect(inspectHtml(el(Button, { size: "sm" }, "Small")).contains("h-8")).toBeTrue();
      expect(inspectHtml(el(Button, { size: "md" }, "Medium")).contains("h-10")).toBeTrue();
      expect(inspectHtml(el(Button, { size: "lg" }, "Large")).contains("h-12")).toBeTrue();
      expect(inspectHtml(el(Button, { size: "icon" }, "X")).contains("w-10")).toBeTrue();
    });

    test("renders loading state with spinning SVG indicator and disabled attribute", () => {
      const inspector = inspectHtml(el(Button, { isLoading: true }, "Submit"));
      expect(inspector.hasAttribute("disabled")).toBeTrue();
      expect(inspector.contains("animate-spin")).toBeTrue();
      expect(inspector.contains("<title>Loading</title>")).toBeTrue();
    });
  });

  // =========================================================================
  // 2. Badge
  // =========================================================================
  describe("Badge", () => {
    test("renders semantic status variants with high contrast styling", () => {
      const variants = [
        "default",
        "secondary",
        "success",
        "warning",
        "destructive",
        "outline",
      ] as const;

      for (const variant of variants) {
        const inspector = inspectHtml(el(Badge, { variant }, "Active"));
        expect(inspector.contains("rounded-full")).toBeTrue();
        expect(inspector.contains("text-xs")).toBeTrue();
      }

      const success = inspectHtml(el(Badge, { variant: "success" }, "OK"));
      expect(success.contains("emerald")).toBeTrue();

      const warning = inspectHtml(el(Badge, { variant: "warning" }, "Warn"));
      expect(warning.contains("amber")).toBeTrue();

      const destructive = inspectHtml(el(Badge, { variant: "destructive" }, "Error"));
      expect(destructive.contains("red")).toBeTrue();
    });
  });

  // =========================================================================
  // 3. Card
  // =========================================================================
  describe("Card", () => {
    test("renders compound components with proper hierarchy", () => {
      const inspector = inspectHtml(
        el(
          Card,
          null,
          el(
            CardHeader,
            null,
            el(CardTitle, null, "Card Title"),
            el(CardDescription, null, "Card Description"),
          ),
          el(CardContent, null, el("p", null, "Card Content")),
          el(CardFooter, null, el("span", null, "Card Footer")),
        ),
      );

      expect(inspector.contains("rounded-2xl")).toBeTrue();
      expect(inspector.contains("bg-card")).toBeTrue();
      expect(inspector.contains("Card Title")).toBeTrue();
      expect(inspector.contains("Card Description")).toBeTrue();
      expect(inspector.contains("Card Content")).toBeTrue();
      expect(inspector.contains("Card Footer")).toBeTrue();
    });

    test("renders interactive variant with cursor and elevation transitions", () => {
      const inspector = inspectHtml(el(Card, { interactive: true }, "Clickable Card"));
      expect(inspector.contains("cursor-pointer")).toBeTrue();
      expect(inspector.contains("hover:border-accent/40")).toBeTrue();
      expect(inspector.contains("hover:shadow-md")).toBeTrue();
    });
  });

  // =========================================================================
  // 4. Input
  // =========================================================================
  describe("Input", () => {
    test("renders standard text input with placeholder and focus ring", () => {
      const inspector = inspectHtml(
        el(Input, { placeholder: "Enter text", type: "text", name: "testInput" }),
      );
      expect(inspector.hasAttribute("placeholder", "Enter text")).toBeTrue();
      expect(inspector.hasAttribute("type", "text")).toBeTrue();
      expect(inspector.contains("focus-visible:ring-2")).toBeTrue();
    });

    test("renders error state with aria-invalid and destructive ring", () => {
      const inspector = inspectHtml(el(Input, { error: true, defaultValue: "bad" }));
      expect(inspector.hasAria("invalid", "true")).toBeTrue();
      expect(inspector.contains("border-destructive")).toBeTrue();
      expect(inspector.contains("focus-visible:ring-destructive")).toBeTrue();
    });

    test("renders leftIcon and rightIcon adornments", () => {
      const left = el("span", { "data-testid": "left" }, "L");
      const right = el("span", { "data-testid": "right" }, "R");
      const inspector = inspectHtml(
        el(Input, { leftIcon: left, rightIcon: right, placeholder: "Search" }),
      );

      expect(inspector.contains("pl-10")).toBeTrue();
      expect(inspector.contains("pr-10")).toBeTrue();
      expect(inspector.contains("L</span>")).toBeTrue();
      expect(inspector.contains("R</span>")).toBeTrue();
    });

    test("preserves caller aria-describedby and appends errorId when error text is provided", () => {
      const inspector = inspectHtml(
        el(Input, {
          id: "username",
          "aria-describedby": "username-help",
          error: "Username is already taken",
        }),
      );
      expect(inspector.hasAria("describedby", "username-help username-error")).toBeTrue();
      expect(inspector.hasAria("invalid", "true")).toBeTrue();
      expect(inspector.contains('id="username-error"')).toBeTrue();
    });
  });

  // =========================================================================
  // 5. Textarea
  // =========================================================================
  describe("Textarea", () => {
    test("renders multi-line textarea with resize and focus ring", () => {
      const inspector = inspectHtml(el(Textarea, { placeholder: "Your thoughts", rows: 4 }));
      expect(inspector.hasAttribute("placeholder", "Your thoughts")).toBeTrue();
      expect(inspector.hasAttribute("rows", "4")).toBeTrue();
      expect(inspector.contains("min-h-[80px]")).toBeTrue();
      expect(inspector.contains("focus-visible:ring-2")).toBeTrue();
    });

    test("renders error state on textarea", () => {
      const inspector = inspectHtml(el(Textarea, { error: true }));
      expect(inspector.hasAria("invalid", "true")).toBeTrue();
      expect(inspector.contains("border-destructive")).toBeTrue();
    });

    test("preserves caller aria-describedby and appends errorId when error text is provided", () => {
      const inspector = inspectHtml(
        el(Textarea, {
          id: "notes",
          "aria-describedby": "notes-hint",
          error: "Notes are required",
        }),
      );
      expect(inspector.hasAria("describedby", "notes-hint notes-error")).toBeTrue();
      expect(inspector.hasAria("invalid", "true")).toBeTrue();
      expect(inspector.contains('id="notes-error"')).toBeTrue();
    });
  });

  // =========================================================================
  // 6. Label
  // =========================================================================
  describe("Label", () => {
    test("renders accessible typography and connects with htmlFor", () => {
      const inspector = inspectHtml(el(Label, { htmlFor: "email" }, "Email Address"));
      expect(inspector.hasAttribute("for", "email")).toBeTrue();
      expect(inspector.contains("font-medium")).toBeTrue();
      expect(inspector.contains("Email Address")).toBeTrue();
    });

    test("renders required indicator when required is true", () => {
      const inspector = inspectHtml(el(Label, { required: true }, "Password"));
      expect(inspector.contains("*")).toBeTrue();
      expect(inspector.contains("text-destructive")).toBeTrue();
    });
  });

  // =========================================================================
  // 7. Select
  // =========================================================================
  describe("Select", () => {
    test("renders styled select with options and chevron icon", () => {
      const inspector = inspectHtml(
        el(
          Select,
          { defaultValue: "opt1", "aria-label": "Choose option" },
          el(SelectOption, { value: "opt1" }, "Option 1"),
          el(SelectOption, { value: "opt2" }, "Option 2"),
        ),
      );

      expect(inspector.contains("Option 1")).toBeTrue();
      expect(inspector.contains("Option 2")).toBeTrue();
      expect(inspector.contains("h-10")).toBeTrue();
      expect(inspector.contains("lucide-chevron-down")).toBeTrue();
    });

    test("renders error state on select", () => {
      const inspector = inspectHtml(el(Select, { error: true }));
      expect(inspector.contains("border-destructive")).toBeTrue();
    });

    test("preserves caller aria-describedby and appends errorId when error text is provided", () => {
      const inspector = inspectHtml(
        el(
          Select,
          {
            id: "cadence",
            "aria-describedby": "cadence-hint",
            error: "Please select cadence",
          },
          el(SelectOption, { value: "daily" }, "Daily"),
        ),
      );
      expect(inspector.hasAria("describedby", "cadence-hint cadence-error")).toBeTrue();
      expect(inspector.hasAria("invalid", "true")).toBeTrue();
      expect(inspector.contains('id="cadence-error"')).toBeTrue();
    });
  });

  // =========================================================================
  // 8. Switch
  // =========================================================================
  describe("Switch", () => {
    test("renders switch with role and aria-checked attribute", () => {
      const offInspector = inspectHtml(el(Switch, { checked: false }));
      expect(offInspector.hasRole("switch")).toBeTrue();
      expect(offInspector.hasAria("checked", "false")).toBeTrue();
      expect(offInspector.contains("translate-x-0")).toBeTrue();

      const onInspector = inspectHtml(el(Switch, { checked: true }));
      expect(onInspector.hasRole("switch")).toBeTrue();
      expect(onInspector.hasAria("checked", "true")).toBeTrue();
      expect(onInspector.contains("translate-x-5")).toBeTrue();
    });

    test("renders with optional label and description", () => {
      const inspector = inspectHtml(
        el(Switch, {
          label: "Enable notifications",
          description: "Receive daily digests",
        }),
      );

      expect(inspector.contains("Enable notifications")).toBeTrue();
      expect(inspector.contains("Receive daily digests")).toBeTrue();
    });
  });

  // =========================================================================
  // 9. Dialog
  // =========================================================================
  describe("Dialog", () => {
    test("renders modal compound components with backdrop and accessibility roles", () => {
      const inspector = inspectHtml(
        el(
          Dialog,
          { open: true },
          el(DialogTrigger, null, "Open Dialog"),
          el(
            DialogContent,
            null,
            el(
              DialogHeader,
              null,
              el(DialogTitle, null, "Confirm Action"),
              el(DialogDescription, null, "Are you sure?"),
            ),
            el(DialogFooter, null, el(DialogClose, null, "Cancel"), el(Button, null, "Confirm")),
          ),
        ),
      );

      expect(inspector.hasRole("dialog")).toBeTrue();
      expect(inspector.hasAria("modal", "true")).toBeTrue();
      expect(inspector.contains("backdrop-blur-sm")).toBeTrue();
      expect(inspector.contains("Confirm Action")).toBeTrue();
      expect(inspector.contains("Are you sure?")).toBeTrue();
      expect(inspector.contains("Cancel")).toBeTrue();
    });
  });

  // =========================================================================
  // 10. Alert
  // =========================================================================
  describe("Alert", () => {
    test("renders default, info, success, warning, and destructive variants", () => {
      const variants = ["default", "info", "success", "warning", "destructive"] as const;

      for (const variant of variants) {
        const inspector = inspectHtml(
          el(
            Alert,
            { variant },
            el(AlertTitle, null, `${variant} alert`),
            el(AlertDescription, null, "Detailed message"),
          ),
        );

        if (variant === "destructive") {
          expect(inspector.hasRole("alert")).toBeTrue();
        } else {
          expect(inspector.hasRole("status")).toBeTrue();
        }
        expect(inspector.contains(`${variant} alert`)).toBeTrue();
        expect(inspector.contains("Detailed message")).toBeTrue();
      }
    });
  });

  // =========================================================================
  // 11. Table
  // =========================================================================
  describe("Table", () => {
    test("renders complete semantic table compound components", () => {
      const inspector = inspectHtml(
        el(
          Table,
          null,
          el(TableCaption, null, "Recent Invoices"),
          el(
            TableHeader,
            null,
            el(
              TableRow,
              null,
              el(TableHead, null, "Invoice"),
              el(TableHead, null, "Status"),
              el(TableHead, null, "Amount"),
            ),
          ),
          el(
            TableBody,
            null,
            el(
              TableRow,
              null,
              el(TableCell, null, "INV-001"),
              el(TableCell, null, "Paid"),
              el(TableCell, null, "$250.00"),
            ),
          ),
          el(
            TableFooter,
            null,
            el(
              TableRow,
              null,
              el(TableCell, null, "Total"),
              el(TableCell, null, ""),
              el(TableCell, null, "$250.00"),
            ),
          ),
        ),
      );

      expect(inspector.contains("<table")).toBeTrue();
      expect(inspector.contains("Recent Invoices")).toBeTrue();
      expect(inspector.contains("INV-001")).toBeTrue();
      expect(inspector.contains("Paid")).toBeTrue();
      expect(inspector.contains("$250.00")).toBeTrue();
      expect(inspector.contains("overflow-auto")).toBeTrue();
    });
  });

  // =========================================================================
  // 12. StatCard
  // =========================================================================
  describe("StatCard", () => {
    test("renders metric title, value, icon, and positive trend", () => {
      const icon = el("span", { "data-testid": "icon" }, "KPI");
      const inspector = inspectHtml(
        el(StatCard, {
          title: "Total Revenue",
          value: "$45,231",
          subtitle: "vs last month",
          icon,
          trend: { value: "+12.5%", positive: true },
        }),
      );

      expect(inspector.contains("Total Revenue")).toBeTrue();
      expect(inspector.contains("$45,231")).toBeTrue();
      expect(inspector.contains("+12.5%")).toBeTrue();
      expect(inspector.contains("vs last month")).toBeTrue();
      expect(inspector.contains("KPI")).toBeTrue();
      expect(inspector.contains("lucide-trending-up")).toBeTrue();
    });

    test("renders negative trend with TrendingDown icon", () => {
      const inspector = inspectHtml(
        el(StatCard, {
          title: "Bounce Rate",
          value: "32%",
          trend: { value: "-4.2%", positive: false },
        }),
      );

      expect(inspector.contains("-4.2%")).toBeTrue();
      expect(inspector.contains("lucide-trending-down")).toBeTrue();
    });
  });

  // =========================================================================
  // 13. Tabs
  // =========================================================================
  describe("Tabs", () => {
    test("renders tab list, tab triggers, and active panel", () => {
      const inspector = inspectHtml(
        el(
          Tabs,
          { defaultValue: "tab1" },
          el(
            TabsList,
            null,
            el(TabsTrigger, { value: "tab1" }, "Overview"),
            el(TabsTrigger, { value: "tab2" }, "Analytics"),
          ),
          el(TabsContent, { value: "tab1" }, "Overview panel content"),
          el(TabsContent, { value: "tab2" }, "Analytics panel content"),
        ),
      );

      expect(inspector.hasRole("tablist")).toBeTrue();
      expect(inspector.contains('role="tab"')).toBeTrue();
      expect(inspector.contains('role="tabpanel"')).toBeTrue();
      expect(inspector.contains("Overview panel content")).toBeTrue();
      expect(inspector.contains('data-state="active"')).toBeTrue();
    });

    test("unmounts inactive tab panels by default", () => {
      const inspector = inspectHtml(
        el(
          Tabs,
          { defaultValue: "tab1" },
          el(
            TabsList,
            null,
            el(TabsTrigger, { value: "tab1" }, "Tab 1"),
            el(TabsTrigger, { value: "tab2" }, "Tab 2"),
          ),
          el(TabsContent, { value: "tab1" }, "Panel 1 Active"),
          el(TabsContent, { value: "tab2" }, "Panel 2 Inactive"),
        ),
      );
      expect(inspector.contains("Panel 1 Active")).toBeTrue();
      expect(inspector.contains("Panel 2 Inactive")).toBeFalse();
    });

    test("forceMount={true} on TabsContent mounts inactive panel with hidden attribute and data-state='inactive'", () => {
      const inspector = inspectHtml(
        el(
          Tabs,
          { defaultValue: "tab1" },
          el(
            TabsList,
            null,
            el(TabsTrigger, { value: "tab1" }, "Tab 1"),
            el(TabsTrigger, { value: "tab2" }, "Tab 2"),
          ),
          el(TabsContent, { value: "tab1" }, "Panel 1 Active"),
          el(TabsContent, { value: "tab2", forceMount: true }, "Panel 2 Inactive"),
        ),
      );
      expect(inspector.contains("Panel 1 Active")).toBeTrue();
      expect(inspector.contains("Panel 2 Inactive")).toBeTrue();
      expect(inspector.contains('data-state="inactive"')).toBeTrue();
      expect(inspector.contains('hidden=""') || inspector.contains("hidden")).toBeTrue();
    });

    test("root forceMount={true} on Tabs cascades to all child TabsContent panels", () => {
      const inspector = inspectHtml(
        el(
          Tabs,
          { defaultValue: "tab1", forceMount: true },
          el(
            TabsList,
            null,
            el(TabsTrigger, { value: "tab1" }, "Tab 1"),
            el(TabsTrigger, { value: "tab2" }, "Tab 2"),
          ),
          el(TabsContent, { value: "tab1" }, "Panel 1 Active"),
          el(TabsContent, { value: "tab2" }, "Panel 2 Inactive"),
        ),
      );
      expect(inspector.contains("Panel 1 Active")).toBeTrue();
      expect(inspector.contains("Panel 2 Inactive")).toBeTrue();
    });

    test("TabsContent with explicit hidden attribute mounts unselected panel", () => {
      const inspector = inspectHtml(
        el(
          Tabs,
          { defaultValue: "tab1" },
          el(
            TabsList,
            null,
            el(TabsTrigger, { value: "tab1" }, "Tab 1"),
            el(TabsTrigger, { value: "tab2" }, "Tab 2"),
          ),
          el(TabsContent, { value: "tab1" }, "Panel 1 Active"),
          el(TabsContent, { value: "tab2", hidden: true }, "Panel 2 Inactive"),
        ),
      );
      expect(inspector.contains("Panel 2 Inactive")).toBeTrue();
    });
  });

  // =========================================================================
  // 14. Tooltip
  // =========================================================================
  describe("Tooltip", () => {
    test("renders declarative tooltip container and exposes compound parts", () => {
      const inspector = inspectHtml(
        el(Tooltip, { content: "Help text", side: "top" }, el(Button, { size: "sm" }, "Hover Me")),
      );

      expect(inspector.contains("Hover Me")).toBeTrue();
      expect(TooltipProvider).toBeDefined();
      expect(TooltipTrigger).toBeDefined();
      expect(TooltipContent).toBeDefined();
    });

    test("renders tooltip content in SSR markup when defaultOpen is true", () => {
      const inspector = inspectHtml(
        el(Tooltip, { content: "Helpful hint", defaultOpen: true }, el(Button, null, "Hover Me")),
      );
      expect(inspector.contains("Hover Me")).toBeTrue();
      expect(inspector.contains("Helpful hint")).toBeTrue();
      expect(inspector.contains('role="tooltip"')).toBeTrue();
      expect(inspector.contains('data-state="open"')).toBeTrue();
      expect(inspector.contains("aria-describedby=")).toBeTrue();
    });

    test("renders hidden tooltip content in SSR markup when forceMount is true", () => {
      const inspector = inspectHtml(
        el(Tooltip, { content: "Hidden hint", forceMount: true }, el(Button, null, "Hover Me")),
      );
      expect(inspector.contains("Hover Me")).toBeTrue();
      expect(inspector.contains("Hidden hint")).toBeTrue();
      expect(inspector.contains('role="tooltip"')).toBeTrue();
      expect(inspector.contains('data-state="closed"')).toBeTrue();
      expect(inspector.contains('hidden=""') || inspector.contains("hidden")).toBeTrue();
    });
  });

  // =========================================================================
  // 15. Navbar
  // =========================================================================
  describe("Navbar", () => {
    test("renders brand, nav links, actions, and mobile toggle", () => {
      const inspector = inspectHtml(
        el(
          Navbar,
          { sticky: true },
          el(NavbarBrand, null, "FirstCup"),
          el(
            NavbarNav,
            null,
            el(NavbarLink, { href: "/features", active: true }, "Features"),
            el(NavbarLink, { href: "/pricing" }, "Pricing"),
          ),
          el(NavbarActions, null, el(Button, { size: "sm" }, "Sign In")),
          el(NavbarMobileToggle, null),
        ),
      );

      expect(inspector.contains("<header")).toBeTrue();
      expect(inspector.contains("sticky top-0")).toBeTrue();
      expect(inspector.contains("FirstCup")).toBeTrue();
      expect(inspector.contains("Features")).toBeTrue();
      expect(inspector.contains("Pricing")).toBeTrue();
      expect(inspector.contains('aria-current="page"')).toBeTrue();
      expect(inspector.contains("Sign In")).toBeTrue();
      expect(inspector.contains('aria-label="Toggle mobile menu"')).toBeTrue();
    });
  });

  // =========================================================================
  // 16. Sidebar
  // =========================================================================
  describe("Sidebar", () => {
    test("renders shell navigation with active indicators and icon/badge slots", () => {
      const icon = el("span", null, "ICON");
      const badge = el(Badge, { variant: "success" }, "NEW");

      const inspector = inspectHtml(
        el(
          Sidebar,
          null,
          el(SidebarHeader, null, "Workspace"),
          el(
            SidebarContent,
            null,
            el(
              SidebarNav,
              null,
              el(SidebarItem, { href: "/dash", active: true, icon, badge }, "Dashboard"),
              el(SidebarItem, { href: "/settings" }, "Settings"),
            ),
          ),
          el(SidebarFooter, null, "User Profile"),
        ),
      );

      expect(inspector.contains("<aside")).toBeTrue();
      expect(inspector.contains("Workspace")).toBeTrue();
      expect(inspector.contains("Dashboard")).toBeTrue();
      expect(inspector.contains("Settings")).toBeTrue();
      expect(inspector.contains("bg-accent/15 text-accent font-semibold")).toBeTrue();
      expect(inspector.contains("ICON")).toBeTrue();
      expect(inspector.contains("NEW")).toBeTrue();
      expect(inspector.contains("User Profile")).toBeTrue();
    });
  });

  // =========================================================================
  // 17. EmptyState
  // =========================================================================
  describe("EmptyState", () => {
    test("renders graphic container, title, description, and action CTA", () => {
      const cta = el(Button, { variant: "primary" }, "Create First Project");
      const inspector = inspectHtml(
        el(EmptyState, {
          title: "No projects found",
          description: "Get started by creating your very first project.",
          action: cta,
        }),
      );

      expect(inspector.contains("No projects found")).toBeTrue();
      expect(inspector.contains("Get started by creating your very first project.")).toBeTrue();
      expect(inspector.contains("Create First Project")).toBeTrue();
      expect(inspector.contains("border-dashed")).toBeTrue();
    });
  });

  // =========================================================================
  // 18. Skeleton
  // =========================================================================
  describe("Skeleton", () => {
    test("renders shimmer pulse placeholder with customized dimensions", () => {
      const inspector = inspectHtml(el(Skeleton, { className: "h-12 w-12 rounded-full" }));

      expect(inspector.contains("animate-pulse")).toBeTrue();
      expect(inspector.contains("bg-muted/60")).toBeTrue();
      expect(inspector.contains("h-12 w-12 rounded-full")).toBeTrue();
    });
  });

  // =========================================================================
  // 19. Export Surface Verification
  // =========================================================================
  describe("Public Export Surface", async () => {
    test("exports all 18 components, compound subcomponents, and theme utilities", async () => {
      const ui = await import("../../packages/ui/src");

      // 1. Button
      expect(ui.Button).toBeDefined();
      expect(ui.buttonVariants).toBeDefined();

      // 2. Badge
      expect(ui.Badge).toBeDefined();
      expect(ui.badgeVariants).toBeDefined();

      // 3. Card
      expect(ui.Card).toBeDefined();
      expect(ui.CardHeader).toBeDefined();
      expect(ui.CardTitle).toBeDefined();
      expect(ui.CardDescription).toBeDefined();
      expect(ui.CardContent).toBeDefined();
      expect(ui.CardFooter).toBeDefined();

      // 4. Input
      expect(ui.Input).toBeDefined();

      // 5. Textarea
      expect(ui.Textarea).toBeDefined();

      // 6. Label
      expect(ui.Label).toBeDefined();

      // 7. Select
      expect(ui.Select).toBeDefined();
      expect(ui.SelectOption).toBeDefined();

      // 8. Switch
      expect(ui.Switch).toBeDefined();

      // 9. Dialog
      expect(ui.Dialog).toBeDefined();
      expect(ui.DialogTrigger).toBeDefined();
      expect(ui.DialogContent).toBeDefined();
      expect(ui.DialogHeader).toBeDefined();
      expect(ui.DialogTitle).toBeDefined();
      expect(ui.DialogDescription).toBeDefined();
      expect(ui.DialogFooter).toBeDefined();
      expect(ui.DialogClose).toBeDefined();

      // 10. Alert
      expect(ui.Alert).toBeDefined();
      expect(ui.alertVariants).toBeDefined();
      expect(ui.AlertTitle).toBeDefined();
      expect(ui.AlertDescription).toBeDefined();

      // 11. Table
      expect(ui.Table).toBeDefined();
      expect(ui.TableHeader).toBeDefined();
      expect(ui.TableBody).toBeDefined();
      expect(ui.TableFooter).toBeDefined();
      expect(ui.TableHead).toBeDefined();
      expect(ui.TableRow).toBeDefined();
      expect(ui.TableCell).toBeDefined();
      expect(ui.TableCaption).toBeDefined();

      // 12. StatCard
      expect(ui.StatCard).toBeDefined();

      // 13. Tabs
      expect(ui.Tabs).toBeDefined();
      expect(ui.TabsList).toBeDefined();
      expect(ui.TabsTrigger).toBeDefined();
      expect(ui.TabsContent).toBeDefined();

      // 14. Tooltip
      expect(ui.Tooltip).toBeDefined();
      expect(ui.TooltipProvider).toBeDefined();
      expect(ui.TooltipTrigger).toBeDefined();
      expect(ui.TooltipContent).toBeDefined();

      // 15. Navbar
      expect(ui.Navbar).toBeDefined();
      expect(ui.NavbarBrand).toBeDefined();
      expect(ui.NavbarNav).toBeDefined();
      expect(ui.NavbarLink).toBeDefined();
      expect(ui.NavbarActions).toBeDefined();
      expect(ui.NavbarMobileToggle).toBeDefined();

      // 16. Sidebar
      expect(ui.Sidebar).toBeDefined();
      expect(ui.SidebarHeader).toBeDefined();
      expect(ui.SidebarContent).toBeDefined();
      expect(ui.SidebarNav).toBeDefined();
      expect(ui.SidebarItem).toBeDefined();
      expect(ui.SidebarFooter).toBeDefined();

      // 17. EmptyState
      expect(ui.EmptyState).toBeDefined();

      // 18. Skeleton
      expect(ui.Skeleton).toBeDefined();

      // Utilities & Theme
      expect(ui.cn).toBeDefined();
      expect(ui.ThemeProvider).toBeDefined();
      expect(ui.ThemeScript).toBeDefined();
      expect(ui.ThemeToggle).toBeDefined();
      expect(ui.useTheme).toBeDefined();
    });
  });
});
