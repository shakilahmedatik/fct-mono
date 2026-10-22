"use client";

import { X } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined);

export interface DialogProps {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Dialog({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: DialogProps) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const contextValue = React.useMemo(() => ({ open, setOpen }), [open, setOpen]);

  return <DialogContext.Provider value={contextValue}>{children}</DialogContext.Provider>;
}

export function useDialog() {
  const context = React.useContext(DialogContext);
  return context;
}

export interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ className, onClick, children, ...props }, ref) => {
    const dialog = useDialog();
    return (
      <button
        ref={ref}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={dialog?.open}
        onClick={(e) => {
          onClick?.(e);
          dialog?.setOpen(true);
        }}
        className={className}
        {...props}
      >
        {children}
      </button>
    );
  },
);
DialogTrigger.displayName = "DialogTrigger";

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  hideCloseButton?: boolean;
}

/**
 * Focusable candidates.
 *
 * `input` is matched by type, so `input[type="hidden"]` has to be excluded
 * explicitly (hidden inputs are not focusable). `iframe`, `object`, `embed`,
 * `summary` and `[contenteditable]` are natively focusable and were missing.
 */
const FOCUSABLE_SELECTOR = [
  "button",
  "[href]",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "iframe",
  "object",
  "embed",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/** Elements that are visually present but cannot receive focus. */
function isHiddenElement(el: HTMLElement): boolean {
  if (el.hasAttribute("hidden")) return true;
  if (el.getAttribute("aria-hidden") === "true") return true;
  // `display: none` / `visibility: hidden` subtrees are not focusable.
  const view = el.ownerDocument?.defaultView;
  if (view && typeof view.getComputedStyle === "function") {
    const style = view.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return true;
  }
  return false;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return elements.filter((el) => {
    if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") {
      return false;
    }
    if (isHiddenElement(el)) {
      return false;
    }
    if (el.getAttribute("tabindex") === "-1") {
      return false;
    }
    return true;
  });
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, hideCloseButton = false, ...props }, ref) => {
    const dialog = useDialog();
    const isOpen = dialog ? dialog.open : true;
    const dialogRef = React.useRef(dialog);
    dialogRef.current = dialog;

    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const previousActiveElement = React.useRef<HTMLElement | null>(null);

    // Merge forwarded ref with internal contentRef
    const setContentRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        contentRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref],
    );

    // Focus trap and focus restoration lifecycle
    React.useEffect(() => {
      if (!isOpen) return;

      // 1. Store currently focused element (the trigger) before moving focus into dialog
      if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        previousActiveElement.current = document.activeElement;
      }

      // 2. Initial focus: focus first focusable element or container
      const focusInitial = () => {
        if (!contentRef.current) return;
        // If an element inside the dialog is already focused (e.g. via autoFocus), preserve it
        if (
          document.activeElement &&
          contentRef.current.contains(document.activeElement) &&
          document.activeElement !== contentRef.current
        ) {
          return;
        }
        const focusable = getFocusableElements(contentRef.current);
        if (focusable.length > 0) {
          focusable[0]?.focus();
        } else {
          contentRef.current.focus();
        }
      };

      focusInitial();
      const focusTimer = setTimeout(focusInitial, 0);

      // 3. Focus trap: cycle Tab and Shift+Tab within focusable elements, handle Escape
      const trapFocus = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          dialogRef.current?.setOpen(false);
          return;
        }

        if (e.key === "Tab") {
          if (!contentRef.current) return;
          const focusable = getFocusableElements(contentRef.current);

          if (focusable.length === 0) {
            e.preventDefault();
            contentRef.current.focus();
            return;
          }

          const firstElement = focusable[0];
          const lastElement = focusable[focusable.length - 1];
          const activeEl = document.activeElement;

          if (e.shiftKey) {
            if (
              activeEl === firstElement ||
              !contentRef.current.contains(activeEl) ||
              activeEl === contentRef.current
            ) {
              e.preventDefault();
              lastElement?.focus();
            }
          } else {
            if (
              activeEl === lastElement ||
              !contentRef.current.contains(activeEl) ||
              activeEl === contentRef.current
            ) {
              e.preventDefault();
              firstElement?.focus();
            }
          }
        }
      };

      window.addEventListener("keydown", trapFocus);

      return () => {
        clearTimeout(focusTimer);
        window.removeEventListener("keydown", trapFocus);
        // Restore focus to the trigger on close
        const elementToRestore = previousActiveElement.current;
        if (
          elementToRestore &&
          typeof elementToRestore.focus === "function" &&
          document.contains(elementToRestore)
        ) {
          elementToRestore.focus();
        }
        previousActiveElement.current = null;
      };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
          aria-hidden="true"
          onClick={() => dialog?.setOpen(false)}
        />
        {/* Modal Surface */}
        <div
          ref={setContentRef}
          tabIndex={-1}
          className={cn(
            "relative z-50 w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl transition-all duration-200 outline-none",
            className,
          )}
          {...props}
        >
          {children}
          {!hideCloseButton && dialog && (
            <button
              type="button"
              onClick={() => dialog.setOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  },
);
DialogContent.displayName = "DialogContent";

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground mt-2", className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

export const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const dialog = useDialog();
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        onClick?.(e);
        dialog?.setOpen(false);
      }}
      className={className}
      {...props}
    />
  );
});
DialogClose.displayName = "DialogClose";
