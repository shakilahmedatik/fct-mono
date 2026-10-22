import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";
export { schema };

/**
 * Maximum number of connections in the postgres.js pool.
 *
 * The driver default is 10, but being explicit keeps the pool size a single
 * documented knob instead of an implicit driver detail.
 */
export const DEFAULT_POOL_SIZE = 10;

export interface CreateDbOptions {
  /** Maximum number of pooled connections. Defaults to {@link DEFAULT_POOL_SIZE}. */
  max?: number;
}

type PostgresClient = ReturnType<typeof postgres>;

/**
 * Every postgres client created through {@link createDb} in this process, so
 * {@link closeDb} can shut all of them down.
 */
const trackedClients = new Set<PostgresClient>();

function resolveConnectionString(connectionString?: string): string {
  const url = connectionString ?? process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Set it to a postgres connection string " +
        '(e.g. "postgresql://postgres:postgres@localhost:5432/first_cup_tech") ' +
        "before creating a database client. Refusing to fall back to a default " +
        "database so a misconfigured deployment cannot silently target the wrong one.",
    );
  }

  return url;
}

/**
 * Creates a new drizzle client.
 *
 * The connection is opened eagerly by postgres.js, so callers are responsible
 * for closing it — {@link closeDb} closes every client created here.
 */
export function createDb(connectionString?: string, options: CreateDbOptions = {}) {
  const url = resolveConnectionString(connectionString);
  const client = postgres(url, { max: options.max ?? DEFAULT_POOL_SIZE });

  trackedClients.add(client);

  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;

let sharedClient: PostgresClient | undefined;
let sharedDb: Database | undefined;

/**
 * The shared, lazily-created database client.
 *
 * The connection is only opened on first use, so importing `@repo/db` (for
 * example to reach the schema alone) does not open a connection pool.
 */
function getSharedDb(): Database {
  if (!sharedDb) {
    const url = resolveConnectionString();
    sharedClient = postgres(url, { max: DEFAULT_POOL_SIZE });
    trackedClients.add(sharedClient);
    sharedDb = drizzle(sharedClient, { schema });
  }

  return sharedDb;
}

/**
 * Lazy proxy around the shared drizzle client.
 *
 * Property access is forwarded to the real client, so `db.query.users.findFirst()`
 * and `db.insert(...)` keep working exactly as before — the client is only
 * created on the first such access.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, property) {
    const instance = getSharedDb();
    const value = Reflect.get(instance as object, property);

    return typeof value === "function" ? value.bind(instance) : value;
  },
});

/**
 * Closes every postgres pool opened by this module.
 *
 * Safe to call more than once, and safe to call when no client was ever
 * created. Used by the API's graceful shutdown path.
 */
export async function closeDb(): Promise<void> {
  const clients = [...trackedClients];
  trackedClients.clear();
  sharedClient = undefined;
  sharedDb = undefined;

  await Promise.all(
    clients.map(async (client) => {
      try {
        await client.end({ timeout: 5 });
      } catch (error) {
        console.error("Failed to close database client cleanly:", error);
      }
    }),
  );
}
