"use client";

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
import { Activity, ExternalLink, FlaskConical, Menu, Radio, Shield, Users, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { appUrl, webUrl } from "../lib/config";
import { initialsFor, useProfile } from "../lib/use-profile";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { profile, isLoading, error: profileError } = useProfile();

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
      label: "Overview",
      icon: <Activity className="h-4 w-4" />,
      active: pathname === "/dashboard" || pathname === "/",
    },
    {
      href: "/users",
      label: "Users & Roles",
      icon: <Users className="h-4 w-4" />,
      active: pathname.startsWith("/users"),
    },
    {
      href: "/digests",
      label: "Pipeline Log",
      icon: <Radio className="h-4 w-4" />,
      active: pathname.startsWith("/digests"),
    },
    {
      href: "/playground",
      label: "AI Playground",
      icon: <FlaskConical className="h-4 w-4" />,
      active: pathname.startsWith("/playground"),
    },
  ];

  const handleNavigate = (href: string) => {
    setMobileOpen(false);
    router.push(href);
  };

  const BrandLogo = (
    <div className="flex items-center gap-2.5 font-bold tracking-tight text-lg">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/20 shadow-xs">
        <Shield className="h-5 w-5" />
      </div>
      <span>
        First Cup <span className="text-accent">Admin</span>
      </span>
    </div>
  );

  const FooterContent = (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-muted-foreground font-medium">API Node: Online</span>
        </div>
        <Badge variant="outline">Bun 1.3</Badge>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 shrink-0 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-[10px] border border-accent/30">
            {initialsFor(profile?.name)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-foreground truncate">
              {profile?.name ?? (isLoading ? "Loading…" : "Signed out")}
            </div>
            <div className="text-muted-foreground truncate">
              {profile?.role ? `Role: ${profile.role}` : "Administrator"}
            </div>
          </div>
        </div>
        <Badge variant="outline">{profile?.email ?? "—"}</Badge>
      </div>

      {profileError && (
        <p className="text-[11px] text-destructive" role="alert">
          {profileError}
        </p>
      )}

      <div className="pt-2 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">Theme</span>
        <ThemeToggle variant="segmented" />
      </div>

      <div className="flex items-center justify-between pt-1 text-xs">
        <a
          href={appUrl("/")}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>User Console</span>
          <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href={webUrl("/")}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Marketing</span>
          <ExternalLink className="h-3 w-3" />
        </a>
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

            <div className="pt-6 border-t border-border">{FooterContent}</div>
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

        <SidebarFooter className="p-6">{FooterContent}</SidebarFooter>
      </Sidebar>
    </>
  );
}
