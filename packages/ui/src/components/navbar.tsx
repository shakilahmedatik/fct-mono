"use client";

import { Menu, X } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

interface NavbarContextValue {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
  inDrawer?: boolean;
}

const NavbarContext = React.createContext<NavbarContextValue | undefined>(undefined);

export function useNavbar() {
  const context = React.useContext(NavbarContext);
  return context;
}

export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  sticky?: boolean;
  mobileContent?: React.ReactNode;
}

export const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  ({ className, sticky = true, mobileContent, children, ...props }, ref) => {
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const toggleMobile = React.useCallback(() => setMobileOpen((prev) => !prev), []);

    const defaultContext = React.useMemo(
      () => ({ mobileOpen, setMobileOpen, toggleMobile, inDrawer: false }),
      [mobileOpen, toggleMobile],
    );

    const drawerContext = React.useMemo(
      () => ({ mobileOpen, setMobileOpen, toggleMobile, inDrawer: true }),
      [mobileOpen, toggleMobile],
    );

    return (
      <NavbarContext.Provider value={defaultContext}>
        <header
          ref={ref}
          className={cn(
            "w-full border-b border-border bg-background/80 backdrop-blur-md transition-all",
            sticky && "sticky top-0 z-40",
            className,
          )}
          {...props}
        >
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            {children}
          </div>
          {mobileOpen && (
            <NavbarContext.Provider value={drawerContext}>
              <div className="border-t border-border bg-background px-4 py-4 md:hidden animate-in slide-in-from-top-2">
                {mobileContent ?? <div className="flex flex-col space-y-3">{children}</div>}
              </div>
            </NavbarContext.Provider>
          )}
        </header>
      </NavbarContext.Provider>
    );
  },
);
Navbar.displayName = "Navbar";

export interface NavbarBrandProps extends React.HTMLAttributes<HTMLDivElement> {
  showInDrawer?: boolean;
}

export const NavbarBrand = React.forwardRef<HTMLDivElement, NavbarBrandProps>(
  ({ className, showInDrawer = false, ...props }, ref) => {
    const navbar = useNavbar();
    if (navbar?.inDrawer && !showInDrawer) return null;

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-2 font-bold text-foreground text-lg", className)}
        {...props}
      />
    );
  },
);
NavbarBrand.displayName = "NavbarBrand";

export const NavbarNav = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => {
    const navbar = useNavbar();
    const inDrawer = navbar?.inDrawer;

    return (
      <nav
        ref={ref}
        aria-label={inDrawer ? "Mobile navigation" : "Main navigation"}
        className={cn(
          inDrawer ? "flex flex-col space-y-3" : "hidden md:flex items-center gap-6",
          className,
        )}
        {...props}
      />
    );
  },
);
NavbarNav.displayName = "NavbarNav";

export interface NavbarLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
}

export const NavbarLink = React.forwardRef<HTMLAnchorElement, NavbarLinkProps>(
  ({ className, active, ...props }, ref) => {
    const navbar = useNavbar();
    const inDrawer = navbar?.inDrawer;

    return (
      <a
        ref={ref}
        aria-current={active ? "page" : undefined}
        className={cn(
          "text-sm font-medium transition-colors hover:text-foreground",
          inDrawer && "block py-1.5",
          active ? "text-foreground font-semibold" : "text-muted-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);
NavbarLink.displayName = "NavbarLink";

export const NavbarActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const navbar = useNavbar();
    const inDrawer = navbar?.inDrawer;

    return (
      <div
        ref={ref}
        className={cn(
          inDrawer ? "flex flex-col gap-2 pt-2 border-t border-border" : "flex items-center gap-3",
          className,
        )}
        {...props}
      />
    );
  },
);
NavbarActions.displayName = "NavbarActions";

export const NavbarMobileToggle = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const navbar = useNavbar();
  if (navbar?.inDrawer) return null;
  const isOpen = navbar?.mobileOpen;

  return (
    <button
      ref={ref}
      type="button"
      onClick={navbar?.toggleMobile}
      aria-label="Toggle mobile menu"
      aria-expanded={isOpen ?? false}
      className={cn(
        "inline-flex md:hidden items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
        className,
      )}
      {...props}
    >
      {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
  );
});
NavbarMobileToggle.displayName = "NavbarMobileToggle";
