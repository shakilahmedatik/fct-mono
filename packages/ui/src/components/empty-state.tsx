import { FolderOpen } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center sm:p-12",
          className,
        )}
        {...props}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground mb-4">
          {icon || <FolderOpen className="h-7 w-7 opacity-80" aria-hidden="true" />}
        </div>
        <h3 className="text-lg font-semibold text-foreground tracking-tight">{title}</h3>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
            {description}
          </p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
    );
  },
);
EmptyState.displayName = "EmptyState";
