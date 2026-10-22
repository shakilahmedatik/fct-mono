"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface TooltipProps {
  /** The content to display inside the tooltip popup */
  content?: React.ReactNode;
  /** The trigger element */
  children: React.ReactNode;
  /** Additional class names for the tooltip popup */
  className?: string;
  /** Placement of the tooltip relative to the trigger */
  side?: "top" | "bottom" | "left" | "right";
  /** Explicit ID for the tooltip element (defaults to auto-generated ID) */
  id?: string;
  /** Controlled open state */
  open?: boolean;
  /** Initial open state for uncontrolled usage (e.g. in SSR testing) */
  defaultOpen?: boolean;
  /** Callback fired when the open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Force mounting the tooltip in the DOM even when closed */
  forceMount?: boolean;
}

export const sideClasses = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export function Tooltip({
  content,
  children,
  className,
  side = "top",
  id,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  forceMount = false,
}: TooltipProps) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const autoId = React.useId();
  const tooltipId = id || autoId;

  // WAI-ARIA: Dismiss tooltip on Escape key press
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setOpen]);

  // Connect trigger child with aria-describedby pointing to the tooltip id
  const trigger = React.useMemo(() => {
    if (!React.isValidElement(children)) {
      return children;
    }

    const childProps = (children as React.ReactElement<Record<string, unknown>>).props;
    const existingDescribedBy =
      typeof childProps?.["aria-describedby"] === "string"
        ? childProps["aria-describedby"]
        : undefined;

    // Connect aria-describedby when tooltip content is present and tooltip is open or forceMounted
    const shouldLink = Boolean(content) && (isOpen || forceMount);
    const describedBy = shouldLink
      ? existingDescribedBy
        ? `${existingDescribedBy} ${tooltipId}`
        : tooltipId
      : existingDescribedBy;

    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      "aria-describedby": describedBy,
    });
  }, [children, content, isOpen, forceMount, tooltipId]);

  const shouldRenderContent = Boolean(content) && (isOpen || forceMount);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tooltip wrapper container tracks hover and focus states
    <div
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {trigger}
      {shouldRenderContent && (
        <div
          role="tooltip"
          id={tooltipId}
          data-state={isOpen ? "open" : "closed"}
          data-side={side}
          hidden={!isOpen && forceMount}
          className={cn(
            "pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md transition-all duration-150 animate-in fade-in-0 zoom-in-95",
            sideClasses[side],
            !isOpen && forceMount && "hidden",
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export interface TooltipTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

export const TooltipTrigger = ({ children }: TooltipTriggerProps) => <>{children}</>;

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "bottom" | "left" | "right";
  forceMount?: boolean;
}

export const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, side = "top", children, ...props }, ref) => (
    <div
      ref={ref}
      role="tooltip"
      data-side={side}
      className={cn(
        "rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md",
        sideClasses[side],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
TooltipContent.displayName = "TooltipContent";
