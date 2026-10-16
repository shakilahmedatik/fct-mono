"use client";

import { authClient } from "@repo/api-client";
import {
  Badge,
  Button,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarNav,
  ThemeToggle,
} from "@repo/ui";
import {
  Coffee,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Sliders,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

export function ConsoleSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Handle Escape key for mobile drawer
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  const navLinks = [
    {
      href: "/dashboard",
      label: "Today's Digest",
      icon: <LayoutDashboard className="h-4 w-4" />,
      active: pathname === "/dashboard" || pathname === "/",
    },
    {
      href: "/preferences",
      label: "Preferences",
      icon: <Sliders className="h-4 w-4" />,
      active: pathname.startsWith("/preferences"),
    },
    {
      href: "/billing",
      label: "Subscription",
      icon: <CreditCard className="h-4 w-4" />,
      active: pathname.startsWith("/billing"),
      badge: <Badge variant="success">PRO</Badge>,
    },
  ];

  const handleNavigate = (href: string) => {
    setMobileOpen(false);
    router.push(href);
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } catch {
      // Best-effort sign out fallback
    } finally {
      router.push("/login");
    }
  };

  const BrandLogo = (
    <div className="flex items-center gap-2.5 font-bold tracking-tight text-lg">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/20 shadow-xs">
        <Coffee className="h-5 w-5" />
      </div>
      <span>
        First Cup <span className="text-accent">Console</span>
      </span>
    </div>
  );

  const UserProfile = (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-xs border border-accent/30">
            FC
          </div>
          <div className="text-xs">
            <div className="font-semibold text-foreground">Engineering Lead</div>
            <div className="text-muted-foreground">Pro Member</div>
          </div>
        </div>
        <Badge variant="success">PRO</Badge>
      </div>

      <div className="pt-2 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">Theme</span>
        <ThemeToggle variant="segmented" />
      </div>

      <div className="flex items-center justify-between pt-1 text-xs">
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Marketing Site</span>
          <ExternalLink className="h-3 w-3" />
        </a>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
        >
          <LogOut className="h-3 w-3" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md">
        <a
          href="/dashboard"
          onClick={(e) => {
            e.preventDefault();
            handleNavigate("/dashboard");
          }}
          className="cursor-pointer"
        >
          {BrandLogo}
        </a>
        <div className="flex items-center gap-2">
          <ThemeToggle variant="cycle" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            className="p-2 cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            id="mobile-drawer"
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-border bg-card p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                {BrandLogo}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="p-1.5 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <SidebarNav>
                {navLinks.map((item) => (
                  <SidebarItem
                    key={item.href}
                    href={item.href}
                    active={item.active}
                    icon={item.icon}
                    badge={item.badge}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavigate(item.href);
                    }}
                  >
                    {item.label}
                  </SidebarItem>
                ))}
              </SidebarNav>
            </div>

            <div className="pt-6 border-t border-border">{UserProfile}</div>
          </aside>
        </div>
      )}

      {/* Desktop Responsive Sidebar */}
      <Sidebar className="hidden md:flex h-screen sticky top-0 w-64 shrink-0">
        <SidebarHeader className="px-6 py-5">
          <a
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate("/dashboard");
            }}
            className="cursor-pointer"
          >
            {BrandLogo}
          </a>
        </SidebarHeader>

        <SidebarContent className="px-4 py-4">
          <SidebarNav>
            {navLinks.map((item) => (
              <SidebarItem
                key={item.href}
                href={item.href}
                active={item.active}
                icon={item.icon}
                badge={item.badge}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate(item.href);
                }}
              >
                {item.label}
              </SidebarItem>
            ))}
          </SidebarNav>
        </SidebarContent>

        <SidebarFooter className="p-6">{UserProfile}</SidebarFooter>
      </Sidebar>
    </>
  );
}
