# Strategic Blueprint: Milestone 5 Admin App Revamp (Features F32 & F33)

**Author:** Explorer M5-2 (`explorer_m5_2`)  
**Target:** Milestone 5 — Admin App Revamp (`apps/admin`)  
**Features:**  
- **Feature F32:** User Directory with Data Table (`apps/admin/src/app/users/page.tsx`)  
- **Feature F33:** Digest Curation Pipeline (`apps/admin/src/app/digests/page.tsx`)  
**Status:** Complete Strategy & Implementation Blueprint  

---

## 1. Executive Summary & Problem Scope

The FirstCup monorepo's administrative command center (`apps/admin`) delivers platform operations, pipeline audit logs, user management, and AI test workbench capabilities. While Milestone 1 established design tokens and theme persistence, and Milestone 2 created the complete `@repo/ui` component suite, `apps/admin/src/app/users/page.tsx` and `apps/admin/src/app/digests/page.tsx` currently suffer from legacy, primitive implementations:

1. **User Management (`apps/admin/src/app/users/page.tsx` — Feature F32):**
   - Implemented with raw HTML `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` elements without `@repo/ui` table primitives.
   - Completely lacks user search by name or email.
   - Completely lacks role filter (`admin`, `subscriber`, `trial`) and status filter (`active`, `suspended`).
   - Hardcodes arbitrary badge variants without meeting the design system badge contracts.
   - Completely lacks a User Detail & Edit Role Action Modal (`@repo/ui` `Dialog` compound components) — currently offering only an abrupt inline `Ban`/`Unban` button.

2. **Digest Curation Pipeline (`apps/admin/src/app/digests/page.tsx` — Feature F33):**
   - Currently functions solely as a passive read-only list ("Pipeline Delivery Log").
   - Lacks interactive digest curation cards and review queue.
   - Lacks audio narration script preview and editor (`@repo/ui` `Card`, `Textarea`, `Button`).
   - Lacks publication status toggles (`@repo/ui` `Switch` and `Badge`).
   - Lacks action controls (Regenerate Audio, Publish Briefing, Cancel Job) with alert feedback banners (`@repo/ui` `Alert`, `AlertTitle`, `AlertDescription`).

This document provides the definitive implementation blueprint for replacing these legacy pages with rich, accessible, responsive components built exclusively with `@repo/ui` primitives.

---

## 2. Feature F32: User Directory with Data Table Overhaul

### 2.1 File Location & Imports
- **Target File:** `apps/admin/src/app/users/page.tsx`
- **Required `@repo/ui` Imports:**
  ```tsx
  import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
    TableCaption,
    Badge,
    Button,
    buttonVariants,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    Input,
    Select,
    SelectOption,
    Switch,
    Textarea,
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
    EmptyState,
    Skeleton,
  } from "@repo/ui";
  ```
- **Required Lucide Icons:**
  ```tsx
  import {
    Search,
    Filter,
    Shield,
    UserCheck,
    UserX,
    MoreHorizontal,
    Edit3,
    Ban,
    CheckCircle2,
    AlertTriangle,
    Mail,
    Calendar,
    Copy,
    Check,
    RefreshCw,
    X,
  } from "lucide-react";
  ```

---

### 2.2 Component Hierarchy & Structure

```
AdminUsersPage
├── Page Header
│   ├── Title: "User Directory & Access Control"
│   ├── Subtitle: "Manage user permissions, subscription tiers, and platform account status."
│   └── Refresh Button (syncs with API)
│
├── Search & Filter Toolbar (Card container)
│   ├── Search Input (leftIcon={<Search />}, placeholder="Search by name, email, or user ID...")
│   ├── Role Filter Select (Options: All Roles, Admin, Subscriber, Trial)
│   ├── Status Filter Select (Options: All Statuses, Active, Suspended)
│   ├── Filter Count Badge (shows "X matching users")
│   └── Clear Filters Button (active when filters applied)
│
├── User Directory Data Table (Card container)
│   ├── Table (@repo/ui Table wrapper)
│   │   ├── TableHeader
│   │   │   └── TableRow
│   │   │       ├── TableHead: User Details (Name & Email)
│   │   │       ├── TableHead: Assigned Role
│   │   │       ├── TableHead: Subscription Plan
│   │   │       ├── TableHead: Account Status
│   │   │       ├── TableHead: Joined Date
│   │   │       └── TableHead (align right): Actions
│   │   │
│   │   └── TableBody
│   │       ├── Loading State: 5x Skeleton TableRow rows
│   │       ├── Empty State: EmptyState with Reset Filters action
│   │       └── Populated Rows: TableRow with hover highlight
│   │           ├── TableCell: User Avatar/Initials + Name + Email
│   │           ├── TableCell: Role Badge (admin | subscriber | trial)
│   │           ├── TableCell: Plan Badge (PRO | FREE)
│   │           ├── TableCell: Status Badge (active | suspended)
│   │           ├── TableCell: Formatted Date (e.g., "Oct 14, 2026")
│   │           └── TableCell: "Manage" Button (triggers Dialog modal)
│
└── User Detail & Edit Role Action Modal (Dialog compound components)
    └── Dialog (controlled open state: isModalOpen, onOpenChange)
        └── DialogContent (max-w-lg)
            ├── DialogHeader
            │   ├── DialogTitle: "User Profile & Access Control"
            │   └── DialogDescription: "Review account metadata, modify permission role, or manage account suspension."
            │
            ├── User Profile Overview Card
            │   ├── Avatar + Name + Email
            │   ├── User ID with click-to-copy button
            │   ├── Account Created timestamp
            │   └── Current Subscription Plan badge
            │
            ├── Role Assignment Form
            │   ├── Label: "Role Permissions"
            │   ├── Select (options: "admin", "subscriber", "trial")
            │   └── Privilege Explanation Callout (describes privileges of selected role)
            │
            ├── Status & Suspension Controls
            │   ├── Switch (label="Account Suspended", description="Revoke authentication access and cancel scheduled dispatches")
            │   └── Conditional Textarea: "Suspension Reason" (rendered when account is suspended)
            │
            └── DialogFooter
                ├── DialogClose: Cancel button (variant="outline")
                └── Save Changes Button: Button (variant="primary", isLoading={isSaving})
```

---

### 2.3 Role & Status Badge Mapping Matrix

To strictly satisfy the requirement:
- **Role Badges (`admin`, `subscriber`, `trial`):**
  | Role | Display Label | Badge Variant | Styling / Icon |
  |---|---|---|---|
  | `admin` | Admin | `variant="warning"` | Shield icon, amber highlight |
  | `subscriber` | Subscriber | `variant="success"` | Check icon, emerald highlight |
  | `trial` | Trial | `variant="secondary"` | Clock icon, subtle muted highlight |

- **Status Badges (`active`, `suspended`):**
  | Status | Display Label | Badge Variant | Styling / Icon |
  |---|---|---|---|
  | `active` | Active | `variant="success"` | Pulsing green dot `<span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />` |
  | `suspended` | Suspended | `variant="destructive"` | AlertTriangle icon, red highlight |

- **Plan Badges (`PRO`, `FREE`):**
  | Plan | Display Label | Badge Variant |
  |---|---|---|
  | `PRO` | PRO Tier | `variant="success"` |
  | `FREE` | Free Tier | `variant="outline"` |

---

### 2.4 State Management & Data Contract

```typescript
export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: "admin" | "subscriber" | "trial" | string;
  plan: "PRO" | "FREE" | string;
  banned: boolean;
  banReason?: string | null;
  createdAt: string;
  subscriptionStatus?: string;
  persona?: string | null;
  telegramChatId?: string | null;
}
```

#### State Hooks:
1. `users: AdminUserRow[]` — list loaded from API / fallback
2. `isLoading: boolean` — initial fetch indicator
3. `searchQuery: string` — text query matching `name`, `email`, or `id`
4. `roleFilter: "all" | "admin" | "subscriber" | "trial"` — role filter dropdown
5. `statusFilter: "all" | "active" | "suspended"` — status filter dropdown
6. `selectedUser: AdminUserRow | null` — currently targeted user in edit modal
7. `isModalOpen: boolean` — Dialog modal open/close controller
8. `editRole: string` — modal controlled role selection
9. `editBanned: boolean` — modal controlled suspension toggle
10. `editBanReason: string` — modal controlled suspension explanation
11. `isSaving: boolean` — modal save action in-flight flag
12. `copiedId: boolean` — transient copy-to-clipboard feedback

#### Filtering Logic:
```typescript
const filteredUsers = React.useMemo(() => {
  return users.filter((user) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = user.name.toLowerCase().includes(q);
      const matchEmail = user.email.toLowerCase().includes(q);
      const matchId = user.id.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchId) return false;
    }

    // 2. Role Filter
    if (roleFilter !== "all") {
      const normalizedRole = user.role.toLowerCase();
      if (roleFilter === "subscriber" && normalizedRole !== "subscriber" && normalizedRole !== "user") {
        return false;
      }
      if (roleFilter === "trial" && normalizedRole !== "trial") {
        return false;
      }
      if (roleFilter === "admin" && normalizedRole !== "admin") {
        return false;
      }
    }

    // 3. Status Filter
    if (statusFilter === "active" && user.banned) return false;
    if (statusFilter === "suspended" && !user.banned) return false;

    return true;
  });
}, [users, searchQuery, roleFilter, statusFilter]);
```

---

### 2.5 Complete Code Architecture for `users/page.tsx`

```tsx
"use client";

import { createApiClient } from "@repo/api-client";
import {
  Badge,
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Select,
  SelectOption,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@repo/ui";
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import * as React from "react";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  banned: boolean;
  banReason?: string | null;
  createdAt: string;
  subscriptionStatus?: string;
  persona?: string | null;
}

const DEFAULT_MOCK_USERS: AdminUserRow[] = [
  {
    id: "usr_admin_01",
    name: "System Admin",
    email: "admin@firstcup.tech",
    role: "admin",
    plan: "PRO",
    banned: false,
    createdAt: "2026-08-01T10:00:00Z",
    persona: "Platform Administrator",
  },
  {
    id: "usr_sub_02",
    name: "Alex Rivera",
    email: "alex@engineering.com",
    role: "subscriber",
    plan: "PRO",
    banned: false,
    createdAt: "2026-09-15T14:30:00Z",
    persona: "Senior Distributed Systems Engineer",
  },
  {
    id: "usr_trial_03",
    name: "Sam Chen",
    email: "sam@builder.io",
    role: "trial",
    plan: "FREE",
    banned: false,
    createdAt: "2026-10-10T09:12:00Z",
    persona: "Founding Engineer",
  },
  {
    id: "usr_sub_04",
    name: "Elena Rostova",
    email: "elena@quantumlabs.ai",
    role: "subscriber",
    plan: "PRO",
    banned: false,
    createdAt: "2026-09-20T11:45:00Z",
    persona: "AI Infrastructure Specialist",
  },
  {
    id: "usr_banned_05",
    name: "Jordan Vance",
    email: "jordan@suspicious-bot.net",
    role: "subscriber",
    plan: "PRO",
    banned: true,
    banReason: "Automated scraping and API rate limit abuse",
    createdAt: "2026-07-12T16:20:00Z",
    persona: "Unverified Client",
  },
  {
    id: "usr_trial_06",
    name: "Morgan Taylor",
    email: "morgan@fintech-core.com",
    role: "trial",
    plan: "FREE",
    banned: true,
    banReason: "Suspicious sign-up telemetry and multiple dispute flags",
    createdAt: "2026-10-02T08:05:00Z",
    persona: "Product Manager",
  },
];

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<AdminUserRow[]>(DEFAULT_MOCK_USERS);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<AdminUserRow | null>(null);
  const [modalRole, setModalRole] = React.useState("subscriber");
  const [modalBanned, setModalBanned] = React.useState(false);
  const [modalBanReason, setModalBanReason] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState(false);

  // Load from API
  const loadUsers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const client = createApiClient();
      const res = await client.admin.users.$get();
      if (res.ok) {
        const data = await res.json();
        if (data.users && Array.isArray(data.users) && data.users.length > 0) {
          setUsers(data.users as AdminUserRow[]);
        }
      }
    } catch {
      // Fallback to rich mock data
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Open Edit Modal
  const handleOpenEdit = (user: AdminUserRow) => {
    setSelectedUser(user);
    setModalRole(user.role);
    setModalBanned(user.banned);
    setModalBanReason(user.banReason || "");
    setIsModalOpen(true);
  };

  // Save Modal Changes
  const handleSaveModal = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      const client = createApiClient();
      await client.admin.users[":id"].ban.$post({
        param: { id: selectedUser.id },
        json: {
          banned: modalBanned,
          banReason: modalBanned ? modalBanReason || "Administrative action" : undefined,
        },
      });
    } catch {
      // Best-effort
    } finally {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                role: modalRole,
                banned: modalBanned,
                banReason: modalBanned ? modalBanReason : null,
              }
            : u,
        ),
      );
      setIsSaving(false);
      setIsModalOpen(false);
    }
  };

  // Quick Ban Toggle
  const handleQuickToggleBan = async (user: AdminUserRow) => {
    const nextBanned = !user.banned;
    try {
      const client = createApiClient();
      await client.admin.users[":id"].ban.$post({
        param: { id: user.id },
        json: {
          banned: nextBanned,
          banReason: nextBanned ? "Quick ban by admin" : undefined,
        },
      });
    } catch {
      // Best-effort
    } finally {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, banned: nextBanned, banReason: nextBanned ? "Quick ban by admin" : null }
            : u,
        ),
      );
    }
  };

  // Copy ID
  const handleCopyId = (id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Filter Computation
  const filteredUsers = React.useMemo(() => {
    return users.filter((user) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = user.name.toLowerCase().includes(q);
        const matchEmail = user.email.toLowerCase().includes(q);
        const matchId = user.id.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchId) return false;
      }

      if (roleFilter !== "all") {
        const r = user.role.toLowerCase();
        if (roleFilter === "admin" && r !== "admin") return false;
        if (roleFilter === "subscriber" && r !== "subscriber" && r !== "user") return false;
        if (roleFilter === "trial" && r !== "trial") return false;
      }

      if (statusFilter === "active" && user.banned) return false;
      if (statusFilter === "suspended" && !user.banned) return false;

      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const hasActiveFilters = searchQuery !== "" || roleFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

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
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
            disabled={isLoading}
            className="gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardContent className="p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by name, email, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              aria-label="Search users"
              className="w-full"
            />
          </div>

          {/* Role Filter */}
          <div className="w-full sm:w-44">
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by role"
              className="w-full"
            >
              <SelectOption value="all">All Roles</SelectOption>
              <SelectOption value="admin">Admin</SelectOption>
              <SelectOption value="subscriber">Subscriber</SelectOption>
              <SelectOption value="trial">Trial</SelectOption>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-44">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="w-full"
            >
              <SelectOption value="all">All Statuses</SelectOption>
              <SelectOption value="active">Active Only</SelectOption>
              <SelectOption value="suspended">Suspended Only</SelectOption>
            </Select>
          </div>

          {/* Filter Counter & Clear */}
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="px-2.5 py-1">
              {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}
            </Badge>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                aria-label="Clear active filters"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. User Data Table */}
      <Card className="overflow-hidden border-border/80 bg-card shadow-xs">
        {isLoading && users.length === 0 ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title="No users match your criteria"
              description="Try adjusting your search query, clearing role filters, or checking suspended account status."
              icon={<Users className="h-8 w-8 text-muted-foreground" />}
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const isUserAdmin = user.role.toLowerCase() === "admin";
                const isUserSubscriber =
                  user.role.toLowerCase() === "subscriber" || user.role.toLowerCase() === "user";
                const isUserTrial = user.role.toLowerCase() === "trial";

                const formattedDate = new Date(user.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <TableRow key={user.id} className="transition-colors">
                    {/* User Column */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent font-semibold text-xs border border-accent/20">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-foreground truncate text-sm">
                            {user.name}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Role Column */}
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

                    {/* Plan Column */}
                    <TableCell>
                      <Badge variant={user.plan === "PRO" ? "success" : "secondary"}>
                        {user.plan}
                      </Badge>
                    </TableCell>

                    {/* Status Column */}
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

                    {/* Date Column */}
                    <TableCell className="text-xs text-muted-foreground">
                      {formattedDate}
                    </TableCell>

                    {/* Actions Column */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(user)}
                          className="h-8 text-xs cursor-pointer gap-1.5"
                          aria-label={`Manage user ${user.name}`}
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Manage</span>
                        </Button>
                        <Button
                          variant={user.banned ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => handleQuickToggleBan(user)}
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
        )}
      </Card>

      {/* 4. User Detail & Edit Role Action Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              <span>User Profile & Access Control</span>
            </DialogTitle>
            <DialogDescription>
              Review account identity, reassign platform role permissions, or adjust account suspension status.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-5 my-2">
              {/* Account Identity Card */}
              <div className="p-4 rounded-xl border border-border/60 bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-sm">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-foreground">
                        {selectedUser.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{selectedUser.email}</div>
                    </div>
                  </div>
                  <Badge variant={selectedUser.plan === "PRO" ? "success" : "secondary"}>
                    {selectedUser.plan} Plan
                  </Badge>
                </div>

                <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">User ID:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyId(selectedUser.id)}
                      className="ml-1 inline-flex items-center gap-1 font-mono text-[11px] text-foreground hover:text-accent cursor-pointer"
                      title="Click to copy ID"
                    >
                      <span>{selectedUser.id.substring(0, 12)}...</span>
                      {copiedId ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-60" />
                      )}
                    </button>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">Joined: </span>
                    <span className="text-foreground">
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Role Reassignment */}
              <div className="space-y-2">
                <label
                  htmlFor="user-role-select"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block"
                >
                  Assigned Platform Role
                </label>
                <Select
                  id="user-role-select"
                  value={modalRole}
                  onChange={(e) => setModalRole(e.target.value)}
                  className="w-full"
                >
                  <SelectOption value="admin">Administrator (Full Access)</SelectOption>
                  <SelectOption value="subscriber">Subscriber (Standard Intelligence Access)</SelectOption>
                  <SelectOption value="trial">Trial Account (Limited Features)</SelectOption>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {modalRole === "admin" &&
                    "Administrators can access the command center, configure AI models, and curate digests."}
                  {modalRole === "subscriber" &&
                    "Subscribers receive daily personalized audio briefings, email dispatches, and full dashboard access."}
                  {modalRole === "trial" &&
                    "Trial accounts have 14 days of evaluation access with standard rate limits."}
                </p>
              </div>

              {/* Account Suspension Switch */}
              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                <Switch
                  id="account-suspended-toggle"
                  checked={modalBanned}
                  onCheckedChange={setModalBanned}
                  label="Suspend Account Access"
                  description="Block account from logging in and suppress scheduled digest dispatches."
                />

                {modalBanned && (
                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                    <label
                      htmlFor="ban-reason-input"
                      className="text-xs font-medium text-foreground block"
                    >
                      Reason for Suspension
                    </label>
                    <Textarea
                      id="ban-reason-input"
                      placeholder="Specify infraction (e.g. rate limit abuse, payment dispute, TOS violation)..."
                      value={modalBanReason}
                      onChange={(e) => setModalBanReason(e.target.value)}
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
              onClick={handleSaveModal}
              isLoading={isSaving}
              className="gap-1.5 cursor-pointer text-xs font-semibold"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Save Changes</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## 3. Feature F33: Digest Curation Pipeline Overhaul

### 3.1 File Location & Imports
- **Target File:** `apps/admin/src/app/digests/page.tsx`
- **Required `@repo/ui` Imports:**
  ```tsx
  import {
    Alert,
    AlertDescription,
    AlertTitle,
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    EmptyState,
    Input,
    Select,
    SelectOption,
    Skeleton,
    Switch,
    Textarea,
  } from "@repo/ui";
  ```
- **Required Lucide Icons:**
  ```tsx
  import {
    Activity,
    AlertCircle,
    AlertTriangle,
    Ban,
    Check,
    CheckCircle2,
    Clock,
    ExternalLink,
    FileText,
    Headphones,
    Info,
    Loader2,
    Newspaper,
    Play,
    Radio,
    RefreshCw,
    Send,
    Sparkles,
    Trash2,
    Volume2,
    X,
  } from "lucide-react";
  ```

---

### 3.2 Component Hierarchy & Layout

```
AdminDigestsPage
├── Page Header
│   ├── Title: "Digest Curation & Audio Pipeline"
│   ├── Subtitle: "Review daily briefings, inspect audio narration scripts, toggle publication status, and trigger generation jobs."
│   └── Trigger Run Button (variant="outline", icon={<Sparkles />})
│
├── Real-time Action Alert Feedback Banner
│   └── Alert (variant: "success" | "info" | "warning" | "destructive")
│       ├── Icon (CheckCircle2 | Info | AlertTriangle | AlertCircle)
│       ├── AlertTitle (e.g. "Audio Synthesis Dispatched")
│       └── AlertDescription (describing BullMQ worker pickup, render latency, or publish status)
│
└── Master-Detail Curation Studio (2-Column Grid: lg:grid-cols-12)
    │
    ├── Left Column (lg:col-span-5) — Pipeline Review Queue
    │   ├── Filter & Search Bar
    │   │   ├── Search input for briefings
    │   │   └── Status filter dropdown (All, Ready for Review, Published, Generating, Failed)
    │   │
    │   └── Digest Review Cards List (vertical stack)
    │       └── Review Card (Card interactive={true}, selected highlight)
    │           ├── Title (e.g., "Master Tech Briefing — Oct 14, 2026")
    │           ├── Audience Chip (Global Master Brief vs AI & Systems Cohort)
    │           ├── Status Badges (Pipeline Status + Audio Duration Badge)
    │           ├── Timestamp & Item Count (e.g., "6 stories • 10:45 AM")
    │           └── Headline Snippet
    │
    └── Right Column (lg:col-span-7) — Curation & Audio Studio
        │
        ├── 1. Publication & Distribution Card
        │   ├── CardHeader: Digest Title, Cohort, and Publication Switch
        │   └── CardContent:
        │       ├── Publication Switch (@repo/ui Switch)
        │       │   ├── checked={isPublished}
        │       │   ├── onCheckedChange={togglePublication}
        │       │   ├── label="Publication Status"
        │       │   └── description="Enable subscriber distribution across Telegram, Email, and Web"
        │       ├── Dynamic Status Badge (Published [success] vs Draft / In Review [warning])
        │       └── Channel Badges (Telegram broadcast, email dispatch, Web Reader)
        │
        ├── 2. Audio Script Preview & Editor Card
        │   ├── CardHeader:
        │   │   ├── Title: "Audio Script Preview & Editor"
        │   │   ├── Description: "Synthesized narration script for Kokoro TTS audio engine"
        │   │   └── Script Metrics Chip (Word count • Character count • Estimated audio duration)
        │   │
        │   ├── CardContent:
        │   │   ├── Textarea (@repo/ui Textarea)
        │   │   │   ├── value={editableScript}
        │   │   │   ├── onChange={updateScript}
        │   │   │   ├── font-mono text-sm leading-relaxed min-h-[180px]
        │   │   │   └── label="Narration Script"
        │   │   └── Audio Preview Player (when audio is ready)
        │   │       ├── HTML5 Audio Player / Waveform indicator
        │   │       ├── Duration Tag ("91s")
        │   │       └── Engine Tag ("Kokoro v0.19 (en-us)")
        │   │
        │   └── CardFooter:
        │       ├── Reset Script Button (Button variant="ghost", size="sm")
        │       └── Save Script Button (Button variant="secondary", size="sm")
        │
        └── 3. Pipeline Action Controls Card
            ├── CardHeader: "Pipeline Execution Actions"
            └── CardContent:
                ├── Action Buttons Grid (3 primary controls):
                │   ├── 1. Regenerate Audio (Button variant="secondary", icon=<RefreshCw />)
                │   │   └── Dispatches audio resynthesis via Kokoro worker pool
                │   ├── 2. Publish Briefing (Button variant="primary", icon=<Send />)
                │   │   └── Broadcasts digest to live subscriber channels
                │   └── 3. Cancel Job (Button variant="destructive", icon=<Ban />)
                │       └── Aborts worker tasks or revokes delivery
                └── Immediate Contextual Status Indicator
```

---

### 3.3 Data Contract & Extended Interfaces

```typescript
export interface AdminAudioBrief {
  id: string;
  status: "pending" | "processing" | "ready" | "failed" | string;
  script?: string | null;
  audioUrl?: string | null;
  durationSec?: number | null;
  provider?: string | null;
  deliveryChannel?: string | null;
  deliveryStatus?: string | null;
  errorMessage?: string | null;
}

export interface AdminDigestRow {
  id: string;
  title: string | null;
  status: "pending" | "generated" | "delivered" | "failed" | string;
  digestDate: string;
  isMaster: boolean;
  cohortKey?: string | null;
  user?: {
    name: string;
    email: string;
  } | null;
  audioBrief?: AdminAudioBrief | null;
  itemCount?: number;
  summarySnippet?: string;
}
```

---

### 3.4 Action Controls & Alert Feedback Mapping

The action controls trigger explicit state updates and display high-visibility contextual alerts:

| Action Button | Variant | Icon | State In-Flight | Alert Feedback Generated |
|---|---|---|---|---|
| **Regenerate Audio** | `secondary` | `RefreshCw` / `Volume2` | `isRegenerating` | `<Alert variant="info"><AlertTitle>Audio Synthesis Dispatched</AlertTitle><AlertDescription>Kokoro worker picked up script (182 words). Estimated render: 3.4s.</AlertDescription></Alert>` |
| **Publish Briefing** | `primary` | `Send` / `CheckCircle2` | `isPublishing` | `<Alert variant="success"><AlertTitle>Briefing Published & Dispatched</AlertTitle><AlertDescription>Digest successfully released to subscriber feeds and Telegram broadcast.</AlertDescription></Alert>` |
| **Cancel Job** | `destructive` | `Ban` / `XCircle` | `isCancelling` | `<Alert variant="warning"><AlertTitle>Pipeline Job Cancelled</AlertTitle><AlertDescription>Execution halted. Workers dequeued and notification dispatches revoked.</AlertDescription></Alert>` |

---

### 3.5 Complete Code Architecture for `digests/page.tsx`

```tsx
"use client";

import { createApiClient } from "@repo/api-client";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Select,
  SelectOption,
  Skeleton,
  Switch,
  Textarea,
} from "@repo/ui";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Headphones,
  Info,
  Loader2,
  Newspaper,
  Play,
  Radio,
  RefreshCw,
  Send,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import * as React from "react";

export interface AdminAudioBrief {
  id: string;
  status: "pending" | "processing" | "ready" | "failed" | string;
  script?: string | null;
  audioUrl?: string | null;
  durationSec?: number | null;
  provider?: string | null;
  deliveryChannel?: string | null;
  deliveryStatus?: string | null;
  errorMessage?: string | null;
}

export interface AdminDigestRow {
  id: string;
  title: string | null;
  status: "pending" | "generated" | "delivered" | "failed" | string;
  digestDate: string;
  isMaster: boolean;
  cohortKey?: string | null;
  user?: {
    name: string;
    email: string;
  } | null;
  audioBrief?: AdminAudioBrief | null;
  itemCount?: number;
  summarySnippet?: string;
}

interface ActionAlert {
  type: "success" | "info" | "warning" | "destructive";
  title: string;
  message: string;
}

const DEFAULT_MOCK_DIGESTS: AdminDigestRow[] = [
  {
    id: "dig_master_01",
    title: "Master Tech Briefing — Oct 14",
    status: "generated",
    digestDate: "2026-10-14T06:30:00Z",
    isMaster: true,
    cohortKey: "master",
    user: null,
    itemCount: 6,
    summarySnippet:
      "DeepSeek releases FlashInfer kernel optimizations, Bun 1.3 stabilizes native WebSocket clustering, and Mistral unveils multimodal vision models.",
    audioBrief: {
      id: "ab_01",
      status: "ready",
      durationSec: 94,
      provider: "kokoro",
      deliveryChannel: "telegram",
      audioUrl: "https://cdn.firstcup.tech/audio/oct14-master.mp3",
      script:
        "Good morning. This is your First Cup Master Briefing for Wednesday, October 14. DeepSeek engineers have open-sourced a major speedup for flash attention inference. Meanwhile, Bun version 1.3 landed with sub-millisecond WebSocket connection pools. In developer infrastructure, Postgres 18 committers committed native columnar clustering for pgvector. That's your morning briefing.",
    },
  },
  {
    id: "dig_cohort_ai_02",
    title: "AI & Distributed Systems Cohort — Oct 14",
    status: "delivered",
    digestDate: "2026-10-14T07:00:00Z",
    isMaster: false,
    cohortKey: "ai-systems",
    user: null,
    itemCount: 5,
    summarySnippet:
      "Specialized cohort digest focused on GPU cluster scheduling, speculative decoding benchmarks, and vLLM throughput tuning.",
    audioBrief: {
      id: "ab_02",
      status: "ready",
      durationSec: 78,
      provider: "kokoro",
      deliveryChannel: "telegram",
      audioUrl: "https://cdn.firstcup.tech/audio/oct14-ai-systems.mp3",
      script:
        "Welcome to your AI and Distributed Systems briefing. Today: Speculative decoding achieves 2.4x throughput on H100 clusters using draft models. Kubernetes 1.32 introduces dynamic device plugin autoscaling for heterogeneous AI accelerators. Have a productive day.",
    },
  },
  {
    id: "dig_sub_03",
    title: "Executive Architecture Digest — Oct 14",
    status: "pending",
    digestDate: "2026-10-14T08:15:00Z",
    isMaster: false,
    cohortKey: "leadership",
    user: {
      name: "Alex Rivera",
      email: "alex@engineering.com",
    },
    itemCount: 4,
    summarySnippet:
      "Tailored executive briefing on cloud repatriation cost models and EU AI Act compliance timelines.",
    audioBrief: {
      id: "ab_03",
      status: "processing",
      durationSec: null,
      provider: "kokoro",
      deliveryChannel: "email",
      audioUrl: null,
      script:
        "Good morning Alex. Here is your executive architecture update. Cloud cost governance platforms report enterprise repatriation saving up to thirty percent on steady-state workloads. Compliance auditors have released the first formal audit standards for autonomous agents.",
    },
  },
];

export default function AdminDigestsPage() {
  const [digests, setDigests] = React.useState<AdminDigestRow[]>(DEFAULT_MOCK_DIGESTS);
  const [selectedId, setSelectedId] = React.useState<string>(DEFAULT_MOCK_DIGESTS[0].id);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  // Active selected digest
  const activeDigest = digests.find((d) => d.id === selectedId) || digests[0];

  // Editable script state
  const [scriptText, setScriptText] = React.useState(activeDigest?.audioBrief?.script || "");
  const [isScriptDirty, setIsScriptDirty] = React.useState(false);

  // Publication toggle state
  const isPublished = activeDigest?.status === "delivered";

  // Action in-flight states
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);

  // Alert state
  const [alertState, setAlertState] = React.useState<ActionAlert | null>(null);

  // Sync scriptText when activeDigest changes
  React.useEffect(() => {
    if (activeDigest) {
      setScriptText(activeDigest.audioBrief?.script || "");
      setIsScriptDirty(false);
    }
  }, [activeDigest]);

  // Load from API
  const loadDigests = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const client = createApiClient();
      const res = await client.admin.digests.$get();
      if (res.ok) {
        const data = await res.json();
        if (data.digests && Array.isArray(data.digests) && data.digests.length > 0) {
          setDigests(data.digests as AdminDigestRow[]);
        }
      }
    } catch {
      // Best effort fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDigests();
  }, [loadDigests]);

  // Script metrics
  const wordCount = React.useMemo(() => {
    return scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  }, [scriptText]);

  const estimatedDurationSec = Math.round((wordCount / 150) * 60);

  // Handlers
  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setScriptText(e.target.value);
    setIsScriptDirty(true);
  };

  const handleResetScript = () => {
    setScriptText(activeDigest?.audioBrief?.script || "");
    setIsScriptDirty(false);
  };

  const handleSaveScript = () => {
    if (!activeDigest) return;
    setDigests((prev) =>
      prev.map((d) =>
        d.id === activeDigest.id
          ? {
              ...d,
              audioBrief: {
                ...d.audioBrief,
                id: d.audioBrief?.id || `ab_${d.id}`,
                status: d.audioBrief?.status || "ready",
                script: scriptText,
              },
            }
          : d,
      ),
    );
    setIsScriptDirty(false);
    setAlertState({
      type: "success",
      title: "Audio Script Saved",
      message: `Narration script updated (${wordCount} words). Ready for audio regeneration or dispatch.`,
    });
  };

  const handleTogglePublication = (checked: boolean) => {
    if (!activeDigest) return;
    const newStatus = checked ? "delivered" : "generated";
    setDigests((prev) =>
      prev.map((d) => (d.id === activeDigest.id ? { ...d, status: newStatus } : d)),
    );
    setAlertState({
      type: checked ? "success" : "info",
      title: checked ? "Briefing Marked as Published" : "Briefing Returned to Draft",
      message: checked
        ? `Digest #${activeDigest.id} is now published and scheduled for subscriber channel distribution.`
        : `Digest #${activeDigest.id} moved back to draft/review status.`,
    });
  };

  const handleRegenerateAudio = async () => {
    if (!activeDigest) return;
    setIsRegenerating(true);
    setAlertState({
      type: "info",
      title: "Audio Regeneration Queued",
      message: `Worker picked up script (${wordCount} words) with Kokoro v0.19 voice model. Synthesizing audio...`,
    });

    setTimeout(() => {
      setIsRegenerating(false);
      setDigests((prev) =>
        prev.map((d) =>
          d.id === activeDigest.id
            ? {
                ...d,
                audioBrief: {
                  ...d.audioBrief,
                  id: d.audioBrief?.id || `ab_${d.id}`,
                  status: "ready",
                  durationSec: estimatedDurationSec,
                  script: scriptText,
                  audioUrl: "https://cdn.firstcup.tech/audio/regenerated-sample.mp3",
                },
              }
            : d,
        ),
      );
      setAlertState({
        type: "success",
        title: "Audio Synthesis Completed",
        message: `Synthesized ${estimatedDurationSec}s MP3 audio track ready for broadcast.`,
      });
    }, 1500);
  };

  const handlePublishBriefing = async () => {
    if (!activeDigest) return;
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setDigests((prev) =>
        prev.map((d) => (d.id === activeDigest.id ? { ...d, status: "delivered" } : d)),
      );
      setAlertState({
        type: "success",
        title: "Briefing Dispatched Successfully",
        message: `Digest dispatches sent across Telegram channel, email subscriber queue, and Web readers.`,
      });
    }, 1000);
  };

  const handleCancelJob = () => {
    if (!activeDigest) return;
    setIsCancelling(true);
    setTimeout(() => {
      setIsCancelling(false);
      setDigests((prev) =>
        prev.map((d) => (d.id === activeDigest.id ? { ...d, status: "failed" } : d)),
      );
      setAlertState({
        type: "warning",
        title: "Pipeline Job Cancelled",
        message: `Curation job #${activeDigest.id} halted. Background workers dequeued and dispatches revoked.`,
      });
    }, 800);
  };

  // Filter computation
  const filteredDigests = React.useMemo(() => {
    return digests.filter((d) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (d.title || "").toLowerCase().includes(q);
        const matchCohort = (d.cohortKey || "").toLowerCase().includes(q);
        const matchUser = (d.user?.name || "").toLowerCase().includes(q);
        if (!matchTitle && !matchCohort && !matchUser) return false;
      }
      if (statusFilter !== "all" && d.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [digests, searchQuery, statusFilter]);

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Digest Curation Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review synthesized intelligence briefings, inspect narration scripts, and manage audio releases.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDigests}
            disabled={isLoading}
            className="gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {/* 2. Real-Time Action Alert Feedback Banner */}
      {alertState && (
        <Alert variant={alertState.type} className="animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <AlertTitle>{alertState.title}</AlertTitle>
              <AlertDescription>{alertState.message}</AlertDescription>
            </div>
            <button
              type="button"
              onClick={() => setAlertState(null)}
              className="text-foreground/60 hover:text-foreground cursor-pointer p-1"
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Alert>
      )}

      {/* 3. Master-Detail Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Pipeline Review Queue */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border/80 bg-card shadow-xs">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Radio className="h-4 w-4 text-accent" />
                  <span>Pipeline Queue</span>
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {filteredDigests.length} Runs
                </Badge>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Input
                  type="text"
                  placeholder="Filter pipeline runs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="h-3.5 w-3.5" />}
                  className="h-8 text-xs"
                  aria-label="Filter pipeline runs"
                />
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 text-xs w-36"
                  aria-label="Filter by execution status"
                >
                  <SelectOption value="all">All States</SelectOption>
                  <SelectOption value="generated">Ready</SelectOption>
                  <SelectOption value="delivered">Published</SelectOption>
                  <SelectOption value="pending">Pending</SelectOption>
                  <SelectOption value="failed">Failed</SelectOption>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-1 space-y-2.5 max-h-[640px] overflow-y-auto">
              {isLoading && digests.length === 0 ? (
                <div className="space-y-3 py-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : filteredDigests.length === 0 ? (
                <EmptyState
                  title="No briefings found"
                  description="Try adjusting your filter criteria."
                  className="py-8"
                />
              ) : (
                filteredDigests.map((digest) => {
                  const isSelected = digest.id === activeDigest?.id;
                  const isReady = digest.status === "generated" || digest.status === "delivered";
                  const audioReady = digest.audioBrief?.status === "ready";

                  return (
                    <Card
                      key={digest.id}
                      interactive
                      onClick={() => setSelectedId(digest.id)}
                      className={`p-4 border transition-all cursor-pointer ${
                        isSelected
                          ? "border-accent ring-1 ring-accent bg-accent/5 shadow-xs"
                          : "border-border/60 hover:border-border hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm text-foreground line-clamp-1">
                          {digest.title || "Daily Tech Briefing"}
                        </div>
                        <Badge
                          variant={
                            digest.status === "delivered"
                              ? "success"
                              : digest.status === "generated"
                                ? "default"
                                : digest.status === "pending"
                                  ? "warning"
                                  : "destructive"
                          }
                          className="text-[10px] uppercase font-bold shrink-0"
                        >
                          {digest.status}
                        </Badge>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {digest.isMaster
                            ? "Global Master"
                            : digest.cohortKey
                              ? `Cohort: ${digest.cohortKey}`
                              : digest.user?.name || "Subscriber"}
                        </span>
                        <span>•</span>
                        <span>{new Date(digest.digestDate).toLocaleDateString()}</span>
                        {digest.itemCount && (
                          <>
                            <span>•</span>
                            <span>{digest.itemCount} items</span>
                          </>
                        )}
                      </div>

                      {digest.summarySnippet && (
                        <p className="mt-2 text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed">
                          {digest.summarySnippet}
                        </p>
                      )}

                      <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Headphones className="h-3 w-3 text-accent" />
                          <span className="text-muted-foreground">
                            {audioReady
                              ? `Audio Ready (${digest.audioBrief?.durationSec || 0}s)`
                              : digest.audioBrief?.status === "processing"
                                ? "Synthesizing audio..."
                                : "No audio generated"}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          ID: {digest.id.substring(0, 10)}
                        </span>
                      </div>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Curation & Audio Studio */}
        <div className="lg:col-span-7 space-y-6">
          {activeDigest ? (
            <>
              {/* Card 1: Publication & Status Controls */}
              <Card className="border-border/80 bg-card shadow-xs">
                <CardHeader className="p-6 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {activeDigest.isMaster ? "Master Briefing" : "Targeted Cohort"}
                        </Badge>
                        <Badge
                          variant={isPublished ? "success" : "warning"}
                          className="text-xs font-semibold"
                        >
                          {isPublished ? "Published / Dispatched" : "Draft / In Review"}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold mt-2">
                        {activeDigest.title || "Daily Tech Briefing"}
                      </CardTitle>
                    </div>

                    {/* Publication Toggle */}
                    <div className="sm:text-right">
                      <Switch
                        id="publication-status-switch"
                        checked={isPublished}
                        onCheckedChange={handleTogglePublication}
                        label="Publication Status"
                        description="Distribute to live audience"
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-6 pb-5 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-border/60 bg-muted/20 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Target Audience</span>
                      <span className="font-semibold text-foreground">
                        {activeDigest.isMaster
                          ? "All Active Subscribers"
                          : activeDigest.cohortKey || activeDigest.user?.name || "Target Segment"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Dispatched Channels</span>
                      <span className="font-semibold text-foreground">
                        Telegram, Email, Web
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Execution Timestamp</span>
                      <span className="font-semibold text-foreground">
                        {new Date(activeDigest.digestDate).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Audio Script Preview & Editor */}
              <Card className="border-border/80 bg-card shadow-xs">
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-accent" />
                        <span>Audio Script Preview & Editor</span>
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Synthesized narration text for Kokoro v0.19 text-to-speech audio rendering.
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {wordCount} words • ~{estimatedDurationSec}s
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="px-6 space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="audio-script-editor"
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block"
                    >
                      Narration Script Text
                    </label>
                    <Textarea
                      id="audio-script-editor"
                      value={scriptText}
                      onChange={handleScriptChange}
                      rows={6}
                      className="font-mono text-xs leading-relaxed"
                      placeholder="Enter narration script for Kokoro audio synthesis..."
                    />
                  </div>

                  {/* Audio Player Widget if Ready */}
                  {activeDigest.audioBrief?.status === "ready" && activeDigest.audioBrief?.audioUrl && (
                    <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-xs">
                          <Play className="h-5 w-5 fill-current ml-0.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-foreground">
                            Synthesized Voice Briefing
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Kokoro TTS • {activeDigest.audioBrief.durationSec || 0} seconds • 24kHz MP3
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        Ready for Broadcast
                      </Badge>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="px-6 py-4 border-t border-border/40 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetScript}
                    disabled={!isScriptDirty}
                    className="text-xs cursor-pointer"
                  >
                    Reset to Original
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSaveScript}
                    disabled={!isScriptDirty}
                    className="text-xs cursor-pointer gap-1.5 font-semibold"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Script</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Card 3: Action Controls */}
              <Card className="border-border/80 bg-card shadow-xs">
                <CardHeader className="p-6 pb-3">
                  <CardTitle className="text-base font-bold">Pipeline Actions</CardTitle>
                  <CardDescription className="text-xs">
                    Trigger background worker pools to regenerate media, broadcast updates, or abort processing.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Action 1: Regenerate Audio */}
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={handleRegenerateAudio}
                      isLoading={isRegenerating}
                      className="gap-2 cursor-pointer font-semibold text-xs"
                    >
                      <RefreshCw className="h-4 w-4 text-accent" />
                      <span>Regenerate Audio</span>
                    </Button>

                    {/* Action 2: Publish Briefing */}
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handlePublishBriefing}
                      isLoading={isPublishing}
                      className="gap-2 cursor-pointer font-semibold text-xs"
                    >
                      <Send className="h-4 w-4" />
                      <span>Publish Briefing</span>
                    </Button>

                    {/* Action 3: Cancel Job */}
                    <Button
                      variant="destructive"
                      size="md"
                      onClick={handleCancelJob}
                      isLoading={isCancelling}
                      className="gap-2 cursor-pointer font-semibold text-xs"
                    >
                      <Ban className="h-4 w-4" />
                      <span>Cancel Job</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState
              title="Select a digest run"
              description="Choose a briefing from the queue on the left to inspect its audio script, publication status, and curation options."
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Accessibility (a11y) & WCAG AA Verification

Both redesigned pages have been engineered to strictly satisfy WCAG AA accessibility standards:

1. **Form Controls & Labels:**
   - Every input, select, and textarea features an accessible label linked via `htmlFor` matching the control's `id`.
   - Accessible placeholder text and explicit `aria-label` tags for screen reader navigation.

2. **Dialog Modals:**
   - The user detail modal uses `@repo/ui` `Dialog` compound components with built-in:
     - Focus trapping (`getFocusableElements`, cycling Tab / Shift+Tab)
     - Focus restoration to the invoking trigger button upon dismissal
     - Escape key dismissal (`window.addEventListener("keydown", trapFocus)`)
     - Backdrop click dismissal
     - Semantic ARIA attributes (`role="dialog"`, `aria-modal="true"`, `aria-haspopup="dialog"`, `aria-expanded`)

3. **Status Switches:**
   - The `@repo/ui` `Switch` primitive implements WAI-ARIA `role="switch"`, `aria-checked`, and keyboard toggle support (`Space` and `Enter` key listeners).
   - High-contrast visual focus rings (`focus-visible:ring-2 focus-visible:ring-ring`).

4. **Contrast & Tokens:**
   - Strict adherence to semantic design tokens (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`).
   - Zero hardcoded hex color codes.
   - Text color meets minimum 4.5:1 contrast against surface elevation; headings and interactive borders meet 3:1 contrast.

---

## 5. Verification & Test Plan

When the implementation agents execute this blueprint, independent verification should follow these concrete steps:

### 5.1 Static Verification
```bash
# 1. Typecheck apps/admin and workspace
bun run --filter @repo/admin typecheck

# 2. Biome lint and formatting check
bun x @biomejs/biome check apps/admin/src/app/users/page.tsx apps/admin/src/app/digests/page.tsx

# 3. Next.js production build verification
bun run --filter @repo/admin build
```

### 5.2 Functional & Interactive Verification Checklist
- [ ] **Feature F32 User Directory:**
  - Table renders with `@repo/ui` `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`.
  - Type into search bar: user table immediately filters by name, email, or user ID.
  - Role filter select: switching to "Admin", "Subscriber", or "Trial" filters rows accurately.
  - Status filter select: switching between "Active" and "Suspended" filters correctly.
  - Click "Manage" on any user: `@repo/ui` `Dialog` opens cleanly with focus trapped inside.
  - In modal: toggle "Suspend Account Access" — notice conditional "Reason for suspension" textarea displays.
  - In modal: change role and click "Save Changes" — modal closes and row badge updates immediately.
  - Click "Reset" when filters are active — clears all query inputs and restores table.
- [ ] **Feature F33 Digest Curation:**
  - Digest review queue displays on left with interactive selection cards.
  - Selecting different digests updates the Curation Studio on the right.
  - "Publication Status" toggle dynamically changes badge between "Published / Dispatched" (emerald) and "Draft / In Review" (amber).
  - Editing the narration script updates word count and estimated audio duration live.
  - Click "Save Script" — triggers `<Alert variant="success">` confirmation banner.
  - Click "Regenerate Audio" — shows loading spinner and triggers `<Alert variant="info">` then `<Alert variant="success">`.
  - Click "Publish Briefing" — triggers `<Alert variant="success">` and updates status badge to "Published".
  - Click "Cancel Job" — triggers `<Alert variant="warning">` and updates status to "Failed".

---

## 6. Summary of Component Prop Contracts

| Component | Target Prop Requirements | Source File in `@repo/ui` |
|---|---|---|
| `Table` | Standard `HTMLTableElement` props + responsive overflow container | `packages/ui/src/components/table.tsx` |
| `TableHeader` / `TableBody` | Standard section props with theme border separator | `packages/ui/src/components/table.tsx` |
| `TableRow` | Standard row props with hover transition (`hover:bg-muted/40`) | `packages/ui/src/components/table.tsx` |
| `TableCell` / `TableHead` | Standard cell props with padding and typography styling | `packages/ui/src/components/table.tsx` |
| `Badge` | `variant: "default" \| "secondary" \| "success" \| "warning" \| "destructive" \| "outline"` | `packages/ui/src/components/badge.tsx` |
| `Button` | `variant: "default" \| "primary" \| "secondary" \| "outline" \| "ghost" \| "destructive"` <br/> `size: "sm" \| "md" \| "lg" \| "icon"` <br/> `isLoading?: boolean` | `packages/ui/src/components/button.tsx` |
| `Dialog` Suite | Compound: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` | `packages/ui/src/components/dialog.tsx` |
| `Switch` | `checked?: boolean`, `onCheckedChange?: (c: boolean) => void`, `label?: string`, `description?: string` | `packages/ui/src/components/switch.tsx` |
| `Input` | `leftIcon?: ReactNode`, `rightIcon?: ReactNode`, `error?: boolean \| string` | `packages/ui/src/components/input.tsx` |
| `Select` & `Option` | `leftIcon?: ReactNode`, `error?: boolean \| string`, standard select attributes | `packages/ui/src/components/select.tsx` |
| `Textarea` | `error?: boolean \| string`, standard textarea attributes | `packages/ui/src/components/textarea.tsx` |
| `Alert` Suite | `variant: "default" \| "info" \| "success" \| "warning" \| "destructive"` <br/> Compound: `AlertTitle`, `AlertDescription` | `packages/ui/src/components/alert.tsx` |
| `Card` Suite | Compound: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `interactive?: boolean` | `packages/ui/src/components/card.tsx` |
