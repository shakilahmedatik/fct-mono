import { Button, EmptyState } from "@repo/ui";
import { AlertTriangle, RefreshCw } from "lucide-react";

export interface DigestErrorStateProps {
  /** Why the briefing could not be loaded. */
  message: string;
  /** Called when the user asks to try again. */
  onRetry: () => void;
  isRetrying?: boolean;
}

/**
 * Explicit failure state for the briefing feed.
 *
 * The dashboard used to fall back to a hard-coded mock digest, which readers
 * could not distinguish from a real briefing. A failed load now renders this
 * state instead.
 */
export function DigestErrorState({ message, onRetry, isRetrying }: DigestErrorStateProps) {
  return (
    <EmptyState
      icon={<AlertTriangle className="h-7 w-7 text-destructive opacity-70" />}
      title="Today’s briefing could not be loaded"
      description={message}
      action={
        <Button variant="outline" size="sm" onClick={onRetry} className="cursor-pointer">
          <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
          <span>{isRetrying ? "Retrying…" : "Retry"}</span>
        </Button>
      }
    />
  );
}
