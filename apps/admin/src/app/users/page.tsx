"use client";

import { createApiClient } from "@repo/api-client";
import { Button, Card } from "@repo/ui";
import * as React from "react";
import { UserManageDialog } from "./components/user-manage-dialog";
import { UsersFilterBar } from "./components/users-filter-bar";
import { UsersTable } from "./components/users-table";
import { type AdminUserRow, API_ROLE_VALUES, PAGE_SIZE } from "./types";

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<AdminUserRow[]>([]);
  const [total, setTotal] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [offset, setOffset] = React.useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<AdminUserRow | null>(null);
  const [modalBanned, setModalBanned] = React.useState(false);
  const [modalBanReason, setModalBanReason] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState(false);
  const [modalFeedback, setModalFeedback] = React.useState<{
    type: "success" | "destructive";
    message: string;
  } | null>(null);

  // Load from API. The API filters and paginates server-side.
  const loadUsers = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const client = createApiClient();

      const query: {
        limit: number;
        offset: number;
        q?: string;
        role?: "user" | "admin";
        banned?: "true" | "false";
      } = { limit: PAGE_SIZE, offset };

      if (searchQuery.trim()) {
        query.q = searchQuery.trim();
      }
      const apiRole = API_ROLE_VALUES[roleFilter];
      if (apiRole) {
        query.role = apiRole;
      }
      if (statusFilter === "active") {
        query.banned = "false";
      } else if (statusFilter === "suspended") {
        query.banned = "true";
      }

      const res = await client.admin.users.$get({ query });
      if (!res.ok) {
        setUsers([]);
        setTotal(null);
        setLoadError(`The user directory could not be loaded (HTTP ${res.status}).`);
        return;
      }

      const data = await res.json();
      const rows: AdminUserRow[] = (Array.isArray(data.users) ? data.users : []).map(
        (u: AdminUserRecord) => ({
          id: u.id,
          name: u.name ?? "—",
          email: u.email ?? "—",
          role: u.role ?? "user",
          plan: u.plan ?? "FREE",
          banned: Boolean(u.banned),
          banReason: u.banReason ?? null,
          createdAt: u.createdAt ?? "",
        }),
      );

      // The API cannot filter by the "trial" role, so that one filter is
      // applied to the page the server returned.
      const visibleRows =
        roleFilter === "trial" ? rows.filter((r) => r.role.toLowerCase() === "trial") : rows;

      setUsers(visibleRows);
      setTotal(typeof data.total === "number" ? data.total : null);
    } catch {
      setUsers([]);
      setTotal(null);
      setLoadError("The user directory could not be loaded. No accounts are shown.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter, offset]);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Open Edit Modal
  const handleOpenEdit = (user: AdminUserRow) => {
    setSelectedUser(user);
    setModalBanned(user.banned);
    setModalBanReason(user.banReason || "");
    setModalFeedback(null);
    setIsModalOpen(true);
  };

  // Save Modal Changes — only the suspension state is persisted.
  const handleSaveModal = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    setModalFeedback(null);
    try {
      const client = createApiClient();
      const res = await client.admin.users[":id"].ban.$post({
        param: { id: selectedUser.id },
        json: {
          banned: modalBanned,
          banReason: modalBanned ? modalBanReason || "Administrative action" : undefined,
        },
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as unknown as {
          error?: string;
        } | null;
        setModalFeedback({
          type: "destructive",
          message:
            errorData?.error ??
            `The change was not saved (HTTP ${res.status}). The account is unchanged.`,
        });
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                banned: modalBanned,
                banReason: modalBanned ? modalBanReason : null,
              }
            : u,
        ),
      );
      setModalFeedback({
        type: "success",
        message: `User ${selectedUser.name} updated successfully.`,
      });
    } catch {
      setModalFeedback({
        type: "destructive",
        message: `The change was not saved — the server could not be reached.`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Ban Toggle
  const handleQuickToggleBan = async (user: AdminUserRow) => {
    const nextBanned = !user.banned;
    try {
      const client = createApiClient();
      const res = await client.admin.users[":id"].ban.$post({
        param: { id: user.id },
        json: {
          banned: nextBanned,
          banReason: nextBanned ? "Quick ban by admin" : undefined,
        },
      });
      if (!res.ok) {
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, banned: nextBanned, banReason: nextBanned ? "Quick ban by admin" : null }
            : u,
        ),
      );
    } catch {
      // The account is unchanged — nothing is reported as saved.
    }
  };

  // Copy User ID
  const handleCopyId = (id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const hasActiveFilters = searchQuery !== "" || roleFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
    setOffset(0);
  };

  const effectiveTotal = total ?? users.length;
  const canPageBack = offset > 0;
  const canPageForward = effectiveTotal > offset + PAGE_SIZE;

  return (
    <div className="space-y-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            User Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Directory of registered accounts, role permissions, and platform account status.
          </p>
        </div>
      </div>

      {loadError && (
        <Card className="border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm text-destructive" role="alert">
            {loadError}
          </p>
        </Card>
      )}

      {/* 2. Search & Filter Bar */}
      <UsersFilterBar
        searchQuery={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setOffset(0);
        }}
        roleFilter={roleFilter}
        onRoleFilterChange={(value) => {
          setRoleFilter(value);
          setOffset(0);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => {
          setStatusFilter(value);
          setOffset(0);
        }}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        visibleCount={users.length}
        total={total}
        clientSideFilterActive={roleFilter === "trial"}
        isLoading={isLoading}
        onRefresh={loadUsers}
      />

      {/* 3. User Directory Data Table */}
      <Card className="overflow-hidden border-border/80 bg-card shadow-xs">
        <UsersTable
          users={users}
          isLoading={isLoading}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          onManage={handleOpenEdit}
          onToggleBan={handleQuickToggleBan}
        />

        {/* Pagination */}
        {total !== null && total > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-4 border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
            <span>
              Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total} users
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canPageBack || isLoading}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                className="h-8 text-xs cursor-pointer"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canPageForward || isLoading}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
                className="h-8 text-xs cursor-pointer"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 4. User Action Modal */}
      <UserManageDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        user={selectedUser}
        banned={modalBanned}
        onBannedChange={setModalBanned}
        banReason={modalBanReason}
        onBanReasonChange={setModalBanReason}
        isSaving={isSaving}
        feedback={modalFeedback}
        onSave={handleSaveModal}
        copied={copiedId}
        onCopyId={handleCopyId}
      />
    </div>
  );
}

interface AdminUserRecord {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  plan: string | null;
  banned: boolean | null;
  banReason: string | null;
  createdAt: string | null;
}
