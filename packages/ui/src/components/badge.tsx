import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-foreground text-background hover:bg-foreground/80",
        secondary: "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
        success:
          "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20",
        warning:
          "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/20",
        destructive:
          "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/20",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
