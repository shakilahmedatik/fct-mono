import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";
import { Card } from "./card";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  subtitle?: string;
  description?: string;
  icon?: React.ReactNode;
  change?: string;
  trend?: "positive" | "negative" | "neutral" | { value: string; positive?: boolean };
}

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, subtitle, description, icon, change, trend, className, ...props }, ref) => {
    let trendType: "positive" | "negative" | "neutral" | null = null;
    let trendLabel: string | null = null;

    if (typeof trend === "object" && trend !== null) {
      trendType = trend.positive ? "positive" : "negative";
      trendLabel = trend.value;
    } else if (typeof trend === "string") {
      trendType = trend;
      trendLabel = change || null;
    } else if (change) {
      trendLabel = change;
      trendType = change.startsWith("+")
        ? "positive"
        : change.startsWith("-")
          ? "negative"
          : "neutral";
    }

    const subText = subtitle || description;

    return (
      <Card
        ref={ref}
        className={cn("p-6 flex flex-col justify-between space-y-4", className)}
        {...props}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 text-foreground">
              {icon}
            </div>
          )}
        </div>

        <div>
          <div className="text-3xl font-extrabold tracking-tight text-foreground">{value}</div>
          {(trendLabel || subText) && (
            <div className="mt-2 flex items-center gap-2">
              {trendLabel && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                    trendType === "positive" &&
                      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                    trendType === "negative" && "bg-red-500/10 text-red-700 dark:text-red-400",
                    trendType === "neutral" && "bg-muted text-muted-foreground",
                  )}
                >
                  {trendType === "positive" && <TrendingUp className="h-3 w-3" />}
                  {trendType === "negative" && <TrendingDown className="h-3 w-3" />}
                  {trendType === "neutral" && <Minus className="h-3 w-3" />}
                  {trendLabel}
                </span>
              )}
              {subText && <span className="text-xs text-muted-foreground">{subText}</span>}
            </div>
          )}
        </div>
      </Card>
    );
  },
);
StatCard.displayName = "StatCard";
