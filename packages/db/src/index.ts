import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";
export { schema };

export function createDb(connectionString?: string) {
  const url =
    connectionString ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/first_cup_tech";

  const client = postgres(url);
  return drizzle(client, { schema });
}

export const db = createDb();

export type Database = ReturnType<typeof createDb>;
