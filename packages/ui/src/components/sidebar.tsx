import * as React from "react";
import { cn } from "../lib/utils";

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  collapsed?: boolean;
}

export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, collapsed = false, ...props }, ref) => (
    <aside
      ref={ref}
      aria-label="Sidebar navigation"
      className={cn(
        "flex flex-col border-r border-border bg-card text-card-foreground transition-all duration-200",
        collapsed ? "w-16" : "w-64",
        className,
      )}
      {...props}
    />
  ),
);
Sidebar.displayName = "Sidebar";

export const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex h-16 items-center border-b border-border px-4", className)}
      {...props}
    />
  ),
);
SidebarHeader.displayName = "SidebarHeader";

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-y-auto px-3 py-4 space-y-1", className)}
    {...props}
  />
));
SidebarContent.displayName = "SidebarContent";

export const SidebarNav = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <nav ref={ref} className={cn("space-y-1", className)} {...props} />
  ),
);
SidebarNav.displayName = "SidebarNav";

export interface SidebarItemProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export const SidebarItem = React.forwardRef<HTMLAnchorElement, SidebarItemProps>(
  ({ className, active, icon, badge, children, ...props }, ref) => (
    <a
      ref={ref}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors select-none",
        active
          ? "bg-accent/15 text-accent font-semibold"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
      {...props}
    >
      {icon && (
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center shrink-0",
            active ? "text-accent" : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 truncate">{children}</span>
      {badge && <span className="ml-auto shrink-0">{badge}</span>}
    </a>
  ),
);
SidebarItem.displayName = "SidebarItem";

export const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("border-t border-border p-4 flex items-center gap-3", className)}
      {...props}
    />
  ),
);
SidebarFooter.displayName = "SidebarFooter";
