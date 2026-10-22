import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

export const alertVariants = cva(
  "relative w-full rounded-xl border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border",
        info: "bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/20 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
        success:
          "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400",
        warning:
          "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/20 [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: React.ReactNode;
  showDefaultIcon?: boolean;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", icon, showDefaultIcon = true, children, ...props }, ref) => {
    let defaultIcon: React.ReactNode = null;
    if (showDefaultIcon && icon === undefined) {
      switch (variant) {
        case "info":
          defaultIcon = <Info className="h-4 w-4" aria-hidden="true" />;
          break;
        case "success":
          defaultIcon = <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
          break;
        case "warning":
          defaultIcon = <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
          break;
        case "destructive":
          defaultIcon = <AlertCircle className="h-4 w-4" aria-hidden="true" />;
          break;
        default:
          defaultIcon = <Info className="h-4 w-4" aria-hidden="true" />;
          break;
      }
    }

    const resolvedIcon = icon !== undefined ? icon : defaultIcon;

    return (
      <div
        ref={ref}
        role={variant === "destructive" ? "alert" : "status"}
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {resolvedIcon}
        <div>{children}</div>
      </div>
    );
  },
);
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";
