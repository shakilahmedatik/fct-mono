/**
 * Shared constants.
 *
 * `DEFAULT_TOPICS`, `AVAILABLE_TOPICS`, `DEFAULT_DELIVERY_HOUR`,
 * `DEFAULT_TIMEZONE`, `PERSONA_OPTIONS` and `AUTH_COOKIE_NAME` were removed:
 * nothing imported them. The defaults they held now live where they are
 * actually used — in the database column defaults (`packages/db/src/schema`)
 * and in the zod validators (`packages/shared-types/src/validators`).
 */

/**
 * Domain the auth cookies are scoped to. The API reads this from the
 * `COOKIE_DOMAIN` environment variable (see apps/api/src/auth.ts).
 */
export const COOKIE_DOMAIN = ".firstcup.tech";
