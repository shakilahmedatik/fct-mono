import type { z } from "zod";
import { adminEnvSchema } from "./admin";
import { apiEnvSchema } from "./api";
import { consoleEnvSchema } from "./console";
import { webEnvSchema } from "./web";
import { workerEnvSchema } from "./worker";

export * from "./admin";
export * from "./api";
export * from "./common";
export * from "./console";
export * from "./web";
export * from "./worker";

/**
 * Every environment schema, keyed by the app it belongs to.
 *
 * This map is the single entry point for {@link parseEnv}.
 */
export const envSchemas = {
  admin: adminEnvSchema,
  api: apiEnvSchema,
  console: consoleEnvSchema,
  web: webEnvSchema,
  worker: workerEnvSchema,
} as const;

export type EnvSchemaName = keyof typeof envSchemas;

export type EnvOf<K extends EnvSchemaName> = z.infer<(typeof envSchemas)[K]>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `  - ${path}: ${issue.message}`;
    })
    .join("\n");
}

/**
 * Validates an environment against one of the app schemas.
 *
 * Call this once at process start (before the app serves traffic) so a missing
 * or malformed variable fails the boot with an actionable message instead of
 * surfacing later as a confusing runtime error.
 *
 * @example
 * ```ts
 * // apps/api/src/index.ts
 * import { parseEnv } from "@repo/shared-types/env";
 *
 * const env = parseEnv("api");
 * ```
 *
 * @throws {Error} When the environment does not satisfy the schema. The error
 * message lists every offending variable.
 */
export function parseEnv<K extends EnvSchemaName>(
  schemaName: K,
  env: Record<string, string | undefined> = process.env,
): EnvOf<K> {
  const schema = envSchemas[schemaName];
  const result = schema.safeParse(env);

  if (!result.success) {
    throw new Error(
      `Invalid environment for "${schemaName}":\n${formatIssues(result.error)}\n\n` +
        "Fix the variables above (see .env.example) and restart the process.",
    );
  }

  return result.data as EnvOf<K>;
}
