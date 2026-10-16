"use client";

import {
  buttonVariants,
  cn,
  Navbar,
  NavbarActions,
  NavbarBrand,
  NavbarLink,
  NavbarMobileToggle,
  NavbarNav,
  ThemeToggle,
  useNavbar,
} from "@repo/ui";
import { ArrowRight, Coffee } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkItem {
  href: string;
  label: string;
  active: boolean;
}

function MobileNavDrawer({ navLinks }: { navLinks: NavLinkItem[] }) {
  const navbar = useNavbar();

  return (
    <div className="flex flex-col space-y-4 py-2">
      {/* Mobile Navigation Links */}
      <nav className="flex flex-col space-y-1" aria-label="Mobile navigation">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            aria-current={link.active ? "page" : undefined}
            onClick={() => navbar?.setMobileOpen(false)}
            className={cn(
              "flex items-center rounded-lg px-3 py-2.5 text-base font-medium transition-colors",
              link.active
                ? "bg-muted font-semibold text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {link.label}
          </a>
        ))}
      </nav>

      {/* Mobile Actions Stack */}
      <div className="flex flex-col gap-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between px-1 text-xs font-medium text-muted-foreground">
          <span>Appearance</span>
          <ThemeToggle variant="segmented" />
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <a
            href="http://localhost:3001"
            onClick={() => navbar?.setMobileOpen(false)}
            className={cn(
              buttonVariants({ variant: "primary", size: "md" }),
              "w-full justify-center gap-1.5 shadow-xs font-semibold",
            )}
          >
            <span>Console</span>
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="http://localhost:3001/login"
            onClick={() => navbar?.setMobileOpen(false)}
            className={cn(
              buttonVariants({ variant: "outline", size: "md" }),
              "w-full justify-center font-medium",
            )}
          >
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  const navLinks: NavLinkItem[] = [
    { href: "/#features", label: "Features", active: false },
    { href: "/pricing", label: "Pricing", active: pathname === "/pricing" },
    { href: "/blog", label: "Blog", active: pathname?.startsWith("/blog") ?? false },
    { href: "/contact", label: "Contact", active: pathname === "/contact" },
  ];

  return (
    <Navbar
      sticky
      className="border-b border-border/50 bg-background/80 backdrop-blur-md"
      mobileContent={<MobileNavDrawer navLinks={navLinks} />}
    >
      {/* Brand Logo */}
      <NavbarBrand>
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight text-lg text-foreground hover:opacity-90 transition-opacity"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/20 shadow-xs">
            <Coffee className="h-5 w-5" />
          </div>
          <span className="text-foreground">
            First Cup <span className="text-accent">Tech</span>
          </span>
        </Link>
      </NavbarBrand>

      {/* Desktop Main Navigation */}
      <NavbarNav>
        {navLinks.map((link) => (
          <NavbarLink
            key={link.href}
            href={link.href}
            active={link.active}
            className="transition-colors hover:text-foreground"
          >
            {link.label}
          </NavbarLink>
        ))}
      </NavbarNav>

      {/* Header Actions */}
      <NavbarActions>
        <ThemeToggle variant="dropdown" align="end" />
        <a
          href="http://localhost:3001/login"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "hidden sm:inline-flex text-muted-foreground hover:text-foreground font-medium",
          )}
        >
          Sign In
        </a>
        <a
          href="http://localhost:3001"
          className={cn(
            buttonVariants({ variant: "primary", size: "sm" }),
            "gap-1.5 shadow-xs font-semibold",
          )}
        >
          <span>Console</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </NavbarActions>

      {/* Mobile Drawer Hamburger Toggle */}
      <NavbarMobileToggle />
    </Navbar>
  );
}
