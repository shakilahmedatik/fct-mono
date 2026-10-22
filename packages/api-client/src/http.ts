/**
 * Response normalisation helpers.
 *
 * The API has no global error handler, so an unhandled server error comes
 * back as `text/plain` "Internal Server Error" with a 500. Calling
 * `response.json()` on that throws a raw `SyntaxError`, which every call site
 * then has to guard against individually.
 *
 * These helpers read the body once, try JSON and fall back to text, and expose
 * the result in a shape that is safe to consume in both cases.
 */

/**
 * Error thrown for a non-2xx API response.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  /** The parsed JSON body, or the raw text when the body was not JSON. */
  readonly body: unknown;
  readonly url: string | undefined;

  constructor(status: number, statusText: string, body: unknown, url?: string) {
    super(ApiError.buildMessage(status, statusText, body));
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.url = url;
  }

  private static buildMessage(status: number, statusText: string, body: unknown): string {
    const detail = extractErrorDetail(body);
    const suffix = detail ? `: ${detail}` : "";
    return `API request failed with ${status} ${statusText}${suffix}`;
  }
}

/**
 * Type guard for {@link ApiError}.
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Builds an {@link ApiError} from a status code and an already parsed body.
 */
export function apiError(status: number, body: unknown, statusText = "", url?: string): ApiError {
  return new ApiError(status, statusText, body, url);
}

export interface ParsedResponse<T = unknown> {
  ok: boolean;
  status: number;
  statusText: string;
  /** The parsed JSON body, or `null` when the body was empty or not JSON. */
  data: T | null;
  /** The raw body text, or `null` when the body could not be read. */
  text: string | null;
  /** Populated when the response was not ok, `null` otherwise. */
  error: ApiError | null;
}

/**
 * Reads a response body safely: JSON when possible, plain text otherwise.
 *
 * Never throws because of a malformed body.
 */
export async function parseResponse<T = unknown>(response: Response): Promise<ParsedResponse<T>> {
  let text: string | null = null;
  let data: T | null = null;

  try {
    text = await response.text();
  } catch {
    text = null;
  }

  if (text !== null && text.trim() !== "") {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = null;
    }
  }

  const error = response.ok
    ? null
    : new ApiError(response.status, response.statusText, data ?? text, response.url);

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    data,
    text,
    error,
  };
}

/**
 * Returns the parsed body of a successful response and throws an
 * {@link ApiError} for everything else.
 *
 * @example
 * ```ts
 * const digest = await readJson<Digest>(await client.digests.$get());
 * ```
 */
export async function readJson<T = unknown>(response: Response): Promise<T> {
  const parsed = await parseResponse<T>(response);

  if (parsed.error) {
    throw parsed.error;
  }

  return (parsed.data ?? parsed.text) as T;
}

function extractErrorDetail(body: unknown): string | undefined {
  if (typeof body === "string") {
    const trimmed = body.trim();
    return trimmed === "" ? undefined : trimmed;
  }

  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const record = body as Record<string, unknown>;

  for (const key of ["error", "message", "detail"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  const errors = record.errors;
  if (Array.isArray(errors)) {
    const messages = errors
      .map((entry) =>
        typeof entry === "string"
          ? entry
          : typeof entry === "object" &&
              entry !== null &&
              typeof (entry as { message?: unknown }).message === "string"
            ? (entry as { message: string }).message
            : undefined,
      )
      .filter((entry): entry is string => Boolean(entry));

    if (messages.length > 0) {
      return messages.join("; ");
    }
  }

  return undefined;
}
