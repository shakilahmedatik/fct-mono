export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  banned: boolean;
  banReason?: string | null;
  createdAt: string;
}

export const PAGE_SIZE = 25;

/**
 * The role values the admin API accepts for its `role` filter.
 * `trial` is not a role the API knows about, so it is applied client-side.
 */
export const API_ROLE_VALUES: Record<string, "user" | "admin" | undefined> = {
  all: undefined,
  admin: "admin",
  subscriber: "user",
  trial: undefined,
};
