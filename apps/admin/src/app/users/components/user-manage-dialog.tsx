import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  buttonVariants,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectOption,
  Switch,
  Textarea,
} from "@repo/ui";
import { Check, CheckCircle2, Copy, Shield } from "lucide-react";
import type { AdminUserRow } from "../types";

export interface UserManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUserRow | null;
  banned: boolean;
  onBannedChange: (banned: boolean) => void;
  banReason: string;
  onBanReasonChange: (value: string) => void;
  isSaving: boolean;
  feedback: { type: "success" | "destructive"; message: string } | null;
  onSave: () => void;
  copied: boolean;
  onCopyId: (id: string) => void;
}

/**
 * Account management dialog.
 *
 * Only account suspension can be persisted — the admin API exposes
 * `POST /admin/users/:id/ban` and no role-assignment endpoint, so the role
 * selector is rendered disabled with an explicit explanation instead of
 * pretending to save a role change.
 */
export function UserManageDialog({
  open,
  onOpenChange,
  user,
  banned,
  onBannedChange,
  banReason,
  onBanReasonChange,
  isSaving,
  feedback,
  onSave,
  copied,
  onCopyId,
}: UserManageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            <span>User Profile &amp; Access Control</span>
          </DialogTitle>
          <DialogDescription>
            Review account metadata and manage account suspension status.
          </DialogDescription>
        </DialogHeader>

        {feedback && (
          <Alert variant={feedback.type === "success" ? "success" : "destructive"} role="alert">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>{feedback.type === "success" ? "Success" : "Error"}</AlertTitle>
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        )}

        {user && (
          <div className="space-y-5 my-2">
            {/* Account Identity Card */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </div>
                <Badge variant={user.plan === "PRO" ? "success" : "secondary"}>
                  {user.plan} Plan
                </Badge>
              </div>

              <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">User ID:</span>
                  <button
                    type="button"
                    onClick={() => onCopyId(user.id)}
                    className="ml-1 inline-flex items-center gap-1 font-mono text-[11px] text-foreground hover:text-accent cursor-pointer"
                    title="Click to copy ID"
                  >
                    <span>{user.id.substring(0, 12)}...</span>
                    {copied ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3 opacity-60" />
                    )}
                  </button>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground">Telegram: </span>
                  <span className="text-foreground font-mono">Not reported by the API</span>
                </div>
              </div>
            </div>

            {/* Role — read only: the API has no role-assignment endpoint */}
            <div className="space-y-2">
              <label
                htmlFor="user-role-select"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block"
              >
                Assigned Platform Role
              </label>
              <Select
                id="user-role-select"
                value={user.role}
                disabled
                className="w-full"
                aria-describedby="user-role-note"
              >
                <SelectOption value={user.role}>{user.role}</SelectOption>
              </Select>
              <p id="user-role-note" className="text-xs text-muted-foreground">
                The admin API exposes no endpoint for changing a user&apos;s role, so this field is
                read-only. Only account suspension can be changed here.
              </p>
            </div>

            {/* Account Suspension Switch */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
              <Switch
                id="account-suspended-toggle"
                checked={banned}
                onCheckedChange={onBannedChange}
                label="Suspend Account Access"
                description="Block account from logging in and revoke its active sessions."
              />

              {banned && (
                <div className="space-y-1.5 pt-2 border-t border-border/40">
                  <label
                    htmlFor="ban-reason-input"
                    className="text-xs font-medium text-foreground block"
                  >
                    Reason for Suspension
                  </label>
                  <Textarea
                    id="ban-reason-input"
                    name="ban-reason"
                    placeholder="Specify infraction (e.g. rate limit abuse, payment dispute, TOS violation)..."
                    value={banReason}
                    onChange={(e) => onBanReasonChange(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "cursor-pointer text-xs",
            })}
          >
            Cancel
          </DialogClose>
          <Button
            variant="primary"
            size="sm"
            onClick={onSave}
            isLoading={isSaving}
            className="gap-1.5 cursor-pointer text-xs font-semibold"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Save Changes</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
