import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: "../../.env" });

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const connectionString =
    process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/first_cup_tech";

  console.log("Connecting to database for migrations...");
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  console.log("Applying migrations from drizzle/migrations...");
  await migrate(db, {
    migrationsFolder: resolve(__dirname, "../drizzle/migrations"),
  });

  console.log("Migrations applied successfully!");
  await sql.end();
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
