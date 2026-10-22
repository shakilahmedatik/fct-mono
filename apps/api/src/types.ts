import type { schema } from "@repo/db";

export type AuthUser = typeof schema.users.$inferSelect;
export type AuthSession = typeof schema.sessions.$inferSelect;

export type AppBindings = {
  Variables: {
    requestId: string;
    user: AuthUser;
    session: AuthSession;
  };
};
