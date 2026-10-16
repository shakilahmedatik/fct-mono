import * as React from "react";
import { cn } from "../lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, id, ...props }, ref) => {
    const hasErrorText = typeof error === "string" && error.trim().length > 0;
    const autoId = React.useId();
    const textareaId = id || (hasErrorText ? autoId : undefined);
    const errorId = hasErrorText ? `${textareaId}-error` : undefined;

    const textareaElement = (
      <textarea
        {...props}
        ref={ref}
        id={textareaId}
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-colors text-foreground",
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

    if (hasErrorText) {
      return (
        <div className="w-full">
          {textareaElement}
          <p id={errorId} className="mt-1.5 text-xs text-destructive" role="alert">
            {error}
          </p>
        </div>
      );
    }

    return textareaElement;
  },
);
Textarea.displayName = "Textarea";
