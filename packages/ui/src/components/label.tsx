import * as React from "react";
import { cn } from "../lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, htmlFor, ...props }, ref) => {
    return (
      <label
        ref={ref}
        htmlFor={htmlFor}
        className={cn(
          "text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none",
          className,
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="ml-1 text-destructive font-bold" aria-hidden="true">
            *
          </span>
        )}
      </label>
    );
  },
);
Label.displayName = "Label";
