import {
  Badge,
  Button,
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { Ban, CheckCircle2, Clock, Edit3, Shield, Users } from "lucide-react";
import type { AdminUserRow } from "../types";

export interface UsersTableProps {
  users: AdminUserRow[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onManage: (user: AdminUserRow) => void;
  onToggleBan: (user: AdminUserRow) => void;
}

/**
 * The user directory table.
 *
 * Every column is rendered from a field the admin API actually returns.
 */
export function UsersTable({
  users,
  isLoading,
  hasActiveFilters,
  onClearFilters,
  onManage,
  onToggleBan,
}: UsersTableProps) {
  if (isLoading && users.length === 0) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="py-12">
        <EmptyState
          title="No users match your criteria"
          description="Try adjusting your search query, clearing role filters, or checking account suspension status."
          icon={<Users className="h-8 w-8 text-muted-foreground" />}
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={onClearFilters}>
                Clear Filters
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[280px]">User</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Subscription Plan</TableHead>
          <TableHead>Signed Up</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const role = user.role.toLowerCase();
          const isUserAdmin = role === "admin";
          const isUserSubscriber = role === "subscriber" || role === "user";
          const isUserTrial = role === "trial";

          return (
            <TableRow key={user.id} className="transition-colors">
              {/* User Column (Name & Email) */}
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent font-semibold text-xs border border-accent/20">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-foreground truncate text-sm">
                      {user.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                  </div>
                </div>
              </TableCell>

              {/* Role Badges: Admin (warning), Subscriber (success), Trial (secondary) */}
              <TableCell>
                {isUserAdmin && (
                  <Badge variant="warning" className="gap-1">
                    <Shield className="h-3 w-3" />
                    <span>Admin</span>
                  </Badge>
                )}
                {isUserSubscriber && (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Subscriber</span>
                  </Badge>
                )}
                {isUserTrial && (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Trial</span>
                  </Badge>
                )}
                {!isUserAdmin && !isUserSubscriber && !isUserTrial && (
                  <Badge variant="outline">{user.role}</Badge>
                )}
              </TableCell>

              {/* Status Badges: Active (success with green pulse), Suspended (destructive) */}
              <TableCell>
                {user.banned ? (
                  <Badge variant="destructive" className="gap-1">
                    <Ban className="h-3 w-3" />
                    <span>Suspended</span>
                  </Badge>
                ) : (
                  <Badge variant="success" className="gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active</span>
                  </Badge>
                )}
              </TableCell>

              {/* Subscription Plan Column */}
              <TableCell>
                <Badge variant={user.plan === "PRO" ? "success" : "secondary"}>{user.plan}</Badge>
              </TableCell>

              {/* Signed Up Column */}
              <TableCell className="text-xs text-muted-foreground">
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </TableCell>

              {/* Actions Column */}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onManage(user)}
                    className="h-8 text-xs cursor-pointer gap-1.5"
                    aria-label={`Manage user ${user.name}`}
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Manage</span>
                  </Button>
                  <Button
                    variant={user.banned ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onToggleBan(user)}
                    className={`h-8 text-xs cursor-pointer ${
                      user.banned
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive hover:bg-destructive/10"
                    }`}
                    aria-label={user.banned ? `Unban ${user.name}` : `Ban ${user.name}`}
                  >
                    {user.banned ? "Unban" : "Ban"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
