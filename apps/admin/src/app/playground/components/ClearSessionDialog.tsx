"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  buttonVariants,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui";
import { AlertTriangle, Trash2 } from "lucide-react";
import * as React from "react";

interface ClearSessionDialogProps {
  sessionId: string;
  onConfirmClear: () => void;
}

export function ClearSessionDialog({ sessionId, onConfirmClear }: ClearSessionDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={buttonVariants({
          variant: "destructive",
          size: "sm",
          className:
            "gap-1.5 text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 cursor-pointer",
        })}
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>Clear</span>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>Reset Active Playground Session?</span>
          </DialogTitle>
          <DialogDescription>
            This action will invalidate all cached pipeline outputs, discard execution logs, and
            initialize a fresh session ID.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            All intermediate results for session{" "}
            <code className="font-mono font-semibold">
              {sessionId ? sessionId.slice(0, 8) : "current"}
            </code>{" "}
            will be permanently lost.
          </AlertDescription>
        </Alert>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose
            className={buttonVariants({
              variant: "outline",
              className: "cursor-pointer",
            })}
          >
            Keep Session
          </DialogClose>
          <Button
            variant="destructive"
            className="cursor-pointer"
            onClick={() => {
              onConfirmClear();
              setOpen(false);
            }}
          >
            Yes, Discard & Reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
