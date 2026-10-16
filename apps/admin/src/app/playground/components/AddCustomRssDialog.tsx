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
  Input,
  Label,
} from "@repo/ui";
import { AlertCircle, Plus, Rss, Tag } from "lucide-react";
import * as React from "react";

interface AddCustomRssDialogProps {
  onAdd: (url: string, name: string) => void;
  existingUrls?: string[];
}

export function AddCustomRssDialog({ onAdd, existingUrls = [] }: AddCustomRssDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextUrl = e.target.value;
    setUrl(nextUrl);
    setError(null);

    // Auto-populate feed name from hostname if name has not been manually touched
    if (nextUrl.trim()) {
      try {
        const parsed = new URL(nextUrl.trim());
        if (!name || name === parsed.hostname) {
          setName(parsed.hostname);
        }
      } catch {
        // Ignore while user is typing
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    const trimmedName = name.trim();

    if (!trimmedUrl) {
      setError("Please provide a valid RSS/Atom feed URL.");
      return;
    }

    try {
      const parsed = new URL(trimmedUrl);
      if (!parsed.protocol.startsWith("http")) {
        setError("Feed URL must begin with http:// or https://");
        return;
      }
    } catch {
      setError("Invalid URL format. Please enter a valid URL (e.g., https://hnrss.org/newest).");
      return;
    }

    if (!trimmedName) {
      setError("Please provide a name or label for this feed.");
      return;
    }

    if (existingUrls.includes(trimmedUrl)) {
      setError("This RSS feed URL has already been added.");
      return;
    }

    onAdd(trimmedUrl, trimmedName);
    setOpen(false);
    setUrl("");
    setName("");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className:
            "gap-1.5 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 cursor-pointer",
        })}
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Add Custom RSS</span>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <Rss className="h-4 w-4" />
              </div>
              <DialogTitle>Add Custom RSS Feed</DialogTitle>
            </div>
            <DialogDescription>
              Connect an external RSS or Atom XML stream to ingest real-time engineering signals
              into the pipeline.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Validation Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="feed-url" required>
                Feed URL
              </Label>
              <Input
                id="feed-url"
                type="url"
                placeholder="https://hnrss.org/newest"
                value={url}
                onChange={handleUrlChange}
                leftIcon={<Rss className="h-4 w-4" />}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="feed-name" required>
                Feed Name / Label
              </Label>
              <Input
                id="feed-name"
                type="text"
                placeholder="e.g., Hacker News RSS"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                leftIcon={<Tag className="h-4 w-4" />}
                required
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose
              className={buttonVariants({
                variant: "outline",
                className: "cursor-pointer",
              })}
            >
              Cancel
            </DialogClose>
            <Button type="submit" variant="primary" className="gap-1.5 cursor-pointer">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Source</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
