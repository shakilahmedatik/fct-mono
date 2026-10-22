import { Badge, Button, Card, CardContent, Input, Select, SelectOption } from "@repo/ui";
import { RefreshCw, Search, X } from "lucide-react";

export interface UsersFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  /** Number of users currently rendered. */
  visibleCount: number;
  /** Total number of users matching the server-side filters. */
  total: number | null;
  /** True when the "trial" filter is applied client-side only. */
  clientSideFilterActive: boolean;
  isLoading: boolean;
  onRefresh: () => void;
}

/**
 * Search, filter and pagination summary for the user directory.
 */
export function UsersFilterBar({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  onClearFilters,
  hasActiveFilters,
  visibleCount,
  total,
  clientSideFilterActive,
  isLoading,
  onRefresh,
}: UsersFilterBarProps) {
  return (
    <Card className="border-border/80 bg-card shadow-xs">
      <CardContent className="p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <Input
            type="search"
            name="user-search"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Search users"
            className="w-full"
          />
        </div>

        {/* Role Filter */}
        <div className="w-full sm:w-44">
          <Select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
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
            onChange={(e) => onStatusFilterChange(e.target.value)}
            aria-label="Filter by status"
            className="w-full"
          >
            <SelectOption value="all">All Statuses</SelectOption>
            <SelectOption value="active">Active</SelectOption>
            <SelectOption value="suspended">Suspended</SelectOption>
          </Select>
        </div>

        {/* Filter Counter & Clear */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="px-2.5 py-1">
            {total === null
              ? `${visibleCount} ${visibleCount === 1 ? "user" : "users"}`
              : `${total} ${total === 1 ? "user" : "users"}`}
          </Badge>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear active filters"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              <span>Reset</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Reload users"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>
        </div>
      </CardContent>
      {clientSideFilterActive && (
        <p className="px-4 pb-3 text-[11px] text-muted-foreground">
          The API cannot filter by the &ldquo;trial&rdquo; role, so it is applied to the current
          page only.
        </p>
      )}
    </Card>
  );
}
