import * as React from "react";
import { cn } from "../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean | string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, leftIcon, rightIcon, id, ...props }, ref) => {
    const hasErrorText = typeof error === "string" && error.trim().length > 0;
    const autoId = React.useId();
    const inputId = id || (hasErrorText ? autoId : undefined);
    const errorId = hasErrorText ? `${inputId}-error` : undefined;

    const inputElement = (
      <input
        {...props}
        ref={ref}
        type={type}
        id={inputId}
        className={cn(
          "flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-colors text-foreground",
          leftIcon && "pl-10",
          rightIcon && "pr-10",
          error && "border-destructive text-destructive focus-visible:ring-destructive",
          className,
        )}
        aria-invalid={error ? "true" : props["aria-invalid"]}
        aria-describedby={
          props["aria-describedby"]
            ? errorId
              ? `${props["aria-describedby"]} ${errorId}`
              : props["aria-describedby"]
            : errorId
        }
      />
    );

    const errorParagraph = hasErrorText && (
      <p id={errorId} className="mt-1.5 text-xs text-destructive" role="alert">
        {error}
      </p>
    );

    if (leftIcon || rightIcon) {
      const wrappedInput = (
        <div className="relative flex w-full items-center">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 flex items-center justify-center text-muted-foreground">
              {leftIcon}
            </div>
          )}
          {inputElement}
          {rightIcon && (
            <div className="pointer-events-none absolute right-3 flex items-center justify-center text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
      );

      if (hasErrorText) {
        return (
          <div className="w-full">
            {wrappedInput}
            {errorParagraph}
          </div>
        );
      }

      return wrappedInput;
    }

    if (hasErrorText) {
      return (
        <div className="w-full">
          {inputElement}
          {errorParagraph}
        </div>
      );
    }

    return inputElement;
  },
);
Input.displayName = "Input";
