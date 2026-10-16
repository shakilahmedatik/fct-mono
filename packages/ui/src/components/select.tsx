import { ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean | string;
  leftIcon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, leftIcon, children, disabled, id, ...props }, ref) => {
    const hasErrorText = typeof error === "string" && error.trim().length > 0;
    const autoId = React.useId();
    const selectId = id || (hasErrorText ? autoId : undefined);
    const errorId = hasErrorText ? `${selectId}-error` : undefined;

    const selectControl = (
      <div className="relative flex w-full items-center">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3 flex items-center justify-center text-muted-foreground">
            {leftIcon}
          </div>
        )}
        <select
          {...props}
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={error ? "true" : props["aria-invalid"]}
          aria-describedby={
            props["aria-describedby"]
              ? errorId
                ? `${props["aria-describedby"]} ${errorId}`
                : props["aria-describedby"]
              : errorId
          }
          className={cn(
            "flex h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-9 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 text-foreground cursor-pointer",
            leftIcon && "pl-10",
            error && "border-destructive text-destructive focus-visible:ring-destructive",
            className,
          )}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute right-3 flex items-center justify-center text-muted-foreground">
          <ChevronDown className="h-4 w-4 opacity-70" aria-hidden="true" />
        </div>
      </div>
    );

    if (hasErrorText) {
      return (
        <div className="w-full">
          {selectControl}
          <p id={errorId} className="mt-1.5 text-xs text-destructive" role="alert">
            {error}
          </p>
        </div>
      );
    }

    return selectControl;
  },
);
Select.displayName = "Select";

export interface SelectOptionProps extends React.OptionHTMLAttributes<HTMLOptionElement> {}

export const SelectOption = React.forwardRef<HTMLOptionElement, SelectOptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <option
        ref={ref}
        className={cn("bg-background text-foreground py-1", className)}
        {...props}
      />
    );
  },
);
SelectOption.displayName = "SelectOption";
