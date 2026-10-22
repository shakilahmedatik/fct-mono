"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      disabled,
      label,
      description,
      onClick,
      onKeyDown,
      id,
      ...props
    },
    ref,
  ) => {
    const isControlled = controlledChecked !== undefined;
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);
    const checked = isControlled ? controlledChecked : uncontrolledChecked;

    const autoId = React.useId();
    const switchId = id || autoId;
    const labelId = label ? `${switchId}-label` : undefined;
    const descriptionId = description ? `${switchId}-desc` : undefined;

    const toggle = React.useCallback(() => {
      if (disabled) return;
      const next = !checked;
      if (!isControlled) {
        setUncontrolledChecked(next);
      }
      onCheckedChange?.(next);
    }, [disabled, checked, isControlled, onCheckedChange]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (!e.defaultPrevented) {
        toggle();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(e);
      if (!e.defaultPrevented && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        toggle();
      }
    };

    const button = (
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        aria-labelledby={props["aria-labelledby"] || labelId}
        aria-describedby={props["aria-describedby"] || descriptionId}
        disabled={disabled}
        ref={ref}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-primary" : "bg-muted",
          className,
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-md ring-0 transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    );

    if (label || description) {
      return (
        <div className="flex items-center space-x-3">
          {button}
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={switchId}
                id={labelId}
                className={cn(
                  "text-sm font-medium text-foreground cursor-pointer select-none",
                  disabled && "cursor-not-allowed opacity-70",
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <span
                id={descriptionId}
                className={cn("text-xs text-muted-foreground", disabled && "opacity-70")}
              >
                {description}
              </span>
            )}
          </div>
        </div>
      );
    }

    return button;
  },
);
Switch.displayName = "Switch";
