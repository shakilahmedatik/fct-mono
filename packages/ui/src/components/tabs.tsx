"use client";

import * as React from "react";
import { cn } from "../lib/utils";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  forceMount?: boolean;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * Whether to force mounting all child TabsContent panels in the DOM, including inactive ones.
   * Inactive panels render with `data-state="inactive"` and the `hidden` attribute.
   * Can be overridden on individual TabsContent components.
   * @default false
   */
  forceMount?: boolean;
}

export function Tabs({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  forceMount = false,
  className,
  children,
  ...props
}: TabsProps) {
  const isControlled = controlledValue !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const value = isControlled ? controlledValue : uncontrolledValue;

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  return (
    <TabsContext.Provider value={{ value, setValue, forceMount }}>
      <div className={cn("w-full space-y-4", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const listRef = React.useRef<HTMLDivElement | null>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const list = listRef.current;
      if (!list) return;

      const tabs = Array.from(
        list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'),
      );
      const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
      if (currentIndex === -1) return;

      let targetIndex = currentIndex;
      if (e.key === "ArrowRight") {
        targetIndex = (currentIndex + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        targetIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        targetIndex = 0;
      } else if (e.key === "End") {
        targetIndex = tabs.length - 1;
      } else {
        return;
      }

      e.preventDefault();
      tabs[targetIndex]?.focus();
      tabs[targetIndex]?.click();
    };

    return (
      <div
        ref={(node) => {
          listRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        role="tablist"
        onKeyDown={handleKeyDown}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
TabsList.displayName = "TabsList";

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, children, onClick, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const isSelected = context ? context.value === value : false;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isSelected}
        data-state={isSelected ? "active" : "inactive"}
        tabIndex={isSelected ? 0 : -1}
        onClick={(e) => {
          onClick?.(e);
          context?.setValue(value);
        }}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          isSelected
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
TabsTrigger.displayName = "TabsTrigger";

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  /**
   * Used to force mounting when persistent DOM presence is needed (e.g. SEO, SSR indexing, or animations).
   * When true, the tab panel is rendered in the DOM when inactive as well, with data-state="inactive" and hidden attribute.
   * @default false
   */
  forceMount?: boolean;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  (
    { className, value, forceMount: propForceMount, hidden: propHidden, children, ...props },
    ref,
  ) => {
    const context = React.useContext(TabsContext);
    const isSelected = context ? context.value === value : true;
    const forceMount = propForceMount ?? context?.forceMount ?? false;
    const isHiddenProvided = propHidden !== undefined;

    if (!isSelected && !forceMount && !isHiddenProvided) {
      return null;
    }

    const isHidden = !isSelected ? true : propHidden;

    return (
      <div
        ref={ref}
        role="tabpanel"
        {...props}
        data-state={isSelected ? "active" : "inactive"}
        hidden={isHidden}
        className={cn(
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className,
          !isSelected && "hidden",
        )}
      >
        {children}
      </div>
    );
  },
);
TabsContent.displayName = "TabsContent";
