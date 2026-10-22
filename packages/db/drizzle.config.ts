import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve the repo-root .env relative to THIS FILE, not the current working
// directory: `config({ path: "../../.env" })` is resolved against process.cwd(),
// so `drizzle-kit push`/`studio` loaded the wrong file when run from the root.
config({ path: resolve(__dirname, "../../../.env") });

export default defineConfig({
  // drizzle-kit resolves `schema` and `out` relative to the CURRENT WORKING
  // DIRECTORY, not to the config file. Running it from the repo root —
  // `bunx drizzle-kit generate --config packages/db/drizzle.config.ts`, which
  // is what CI does — therefore looked for `./src/schema/index.ts` at the repo
  // root and failed with "No schema files found". Resolve both paths against
  // this file's own directory so the command works from anywhere.
  schema: resolve(__dirname, "./src/schema/index.ts"),
  out: resolve(__dirname, "./drizzle/migrations"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
