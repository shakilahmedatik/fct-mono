import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import pino from "pino";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve the repo-root .env relative to THIS FILE, not the current working
// directory: `config({ path: "../../.env" })` is resolved against process.cwd(),
// so running this script from the repo root silently loaded the wrong file.
config({ path: resolve(__dirname, "../../../.env") });

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    logger.error(
      "DATABASE_URL is not set. Point it at the database you want to migrate " +
        '(e.g. "postgresql://postgres:postgres@localhost:5432/first_cup_tech") and ' +
        "re-run. The migrate script no longer falls back to a default database.",
    );
    process.exit(1);
  }

  logger.info("Connecting to database for migrations...");
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  logger.info("Applying migrations from drizzle/migrations...");
  await migrate(db, {
    migrationsFolder: resolve(__dirname, "../drizzle/migrations"),
  });

  logger.info("Migrations applied successfully!");
  await sql.end();
}

runMigrations().catch((err) => {
  logger.error({ err }, "Migration failed:");
  process.exit(1);
});
