import { isSafeHttpUrl } from "@repo/pipeline";
import { workerLogger } from "../lib/logger";
import type {
  AudioBriefDeliveryPayload,
  DeliveryChannelAdapter,
  DeliveryErrorCode,
  DeliveryResult,
  TextBriefDeliveryPayload,
} from "./types";

/** Telegram rejects captions longer than 1024 characters. */
const TELEGRAM_CAPTION_LIMIT = 1024;
/** Telegram rejects messages longer than 4096 characters. */
const TELEGRAM_TEXT_LIMIT = 4096;

/** Every outbound Telegram request is aborted after this many milliseconds. */
const TELEGRAM_REQUEST_TIMEOUT_MS = 10_000;

interface TelegramApiResponse {
  ok?: boolean;
  description?: string;
  error_code?: number;
  result?: {
    message_id?: number | string;
    [key: string]: unknown;
  };
}

export function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function classifyTelegramError(
  statusCode: number,
  description?: string,
): { errorCode: DeliveryErrorCode; isPermanentFailure: boolean } {
  const desc = description?.toLowerCase() || "";

  // 1. HTTP 403: Bot blocked by user, user deactivated, bot kicked
  if (
    statusCode === 403 ||
    desc.includes("bot was blocked by the user") ||
    desc.includes("bot was blocked") ||
    desc.includes("user is deactivated") ||
    desc.includes("bot kicked") ||
    (desc.includes("forbidden") && desc.includes("block"))
  ) {
    return {
      errorCode: "BOT_BLOCKED",
      isPermanentFailure: true,
    };
  }

  // 2. HTTP 400: Permanent chat errors (chat not found, invalid chat_id, unstarted bot)
  if (
    (statusCode === 400 || statusCode === 0) &&
    (desc.includes("chat not found") ||
      desc.includes("chat_id is empty") ||
      desc.includes("chat_id is invalid") ||
      desc.includes("invalid chat") ||
      desc.includes("invalid user") ||
      desc.includes("peer_id_invalid") ||
      desc.includes("user not found") ||
      desc.includes("bot can't initiate") ||
      desc.includes("can't initiate conversation") ||
      desc.includes("user never started") ||
      desc.includes("chat not activated"))
  ) {
    return {
      errorCode: "CHAT_NOT_FOUND",
      isPermanentFailure: true,
    };
  }

  // 3. HTTP 400: Parse error (e.g. malformed HTML entities)
  if (
    statusCode === 400 &&
    (desc.includes("can't parse entities") ||
      desc.includes("parse entities") ||
      desc.includes("entity"))
  ) {
    return {
      errorCode: "PARSE_ERROR",
      isPermanentFailure: false,
    };
  }

  // 4. HTTP 429: Rate limited
  if (statusCode === 429 || desc.includes("too many requests")) {
    return {
      errorCode: "RATE_LIMITED",
      isPermanentFailure: false,
    };
  }

  // 5. HTTP >= 500: Server errors
  if (statusCode >= 500) {
    return {
      errorCode: "SERVER_ERROR",
      isPermanentFailure: false,
    };
  }

  return {
    errorCode: statusCode === 400 ? "INVALID_CHAT_ID" : "UNKNOWN",
    isPermanentFailure: false,
  };
}

function isLocalOrPrivateUrl(urlStr: string): boolean {
  if (urlStr.startsWith("/")) return true;
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "host.docker.internal" ||
      host.endsWith(".local") ||
      host.startsWith("192.168.") ||
      host.startsWith("10.")
    );
  } catch {
    return true;
  }
}

/**
 * Mock deliveries are only used when they were explicitly requested.
 *
 * A missing bot token used to be treated as "mock mode", which turned a typo
 * in an environment variable into a delivery system that reported 100% success
 * without sending anything.
 */
function isMockMode(): boolean {
  return process.env.DELIVERY_MOCK === "true";
}

function assertTelegramConfigured(): void {
  if (isMockMode()) return;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.includes("your-") || token.trim().length === 0) {
    throw new Error(
      "Telegram bot token is not configured (TELEGRAM_BOT_TOKEN). Set DELIVERY_MOCK=true to send mock deliveries in development.",
    );
  }
}

/**
 * Truncate a piece of text on a word boundary.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, Math.max(0, maxLength - 1));
  const lastSpace = clipped.lastIndexOf(" ");
  const base = lastSpace > maxLength * 0.6 ? clipped.slice(0, lastSpace) : clipped;
  return `${base.trimEnd()}…`;
}

/**
 * Telegram only accepts a small set of tags. This checks that every opened tag
 * is closed again — an unbalanced caption is rejected by Telegram with a 400
 * that is otherwise very easy to miss.
 */
export function hasBalancedTelegramTags(html: string): boolean {
  const stack: string[] = [];
  const pattern = /<(\/?)(b|i|a)>/g;
  let match = pattern.exec(html);

  while (match !== null) {
    const closing = match[1] === "/";
    const tag = match[2];
    if (closing) {
      if (stack.pop() !== tag) return false;
    } else {
      stack.push(tag);
    }
    match = pattern.exec(html);
  }

  return stack.length === 0;
}

interface TelegramBlockOptions {
  limit: number;
  footer: string;
  includeWhy: boolean;
  maxItems: number;
  intro: string;
  header: string;
}

/**
 * Build a Telegram message that fits into the given character budget.
 *
 * The budget is respected by truncating the *fields* (title, why it matters)
 * instead of slicing the assembled string: slicing can cut an open tag in half
 * and Telegram then rejects the whole message.
 */
function buildTelegramMessage(
  payload: AudioBriefDeliveryPayload | TextBriefDeliveryPayload,
  options: TelegramBlockOptions,
): string {
  const { limit, footer, includeWhy, maxItems, intro, header } = options;

  const blocks: string[] = [];
  let used = header.length + intro.length + footer.length;

  for (const [index, item] of payload.items.slice(0, maxItems).entries()) {
    const sourceBadge = `[${escapeTelegramHtml(item.source.toUpperCase())}]`;
    const link = buildItemLink(item.url, item.title);

    // The "why it matters" line is the first thing that is shortened: it is
    // supplementary, the link and the title are not.
    const why =
      includeWhy && item.whyItMatters
        ? `\n   ↳ <i>${escapeTelegramHtml(truncateText(item.whyItMatters, 200))}</i>`
        : "";

    let block = `${index + 1}. <b>${sourceBadge}</b> ${link}${why}`;
    let title = item.title;

    while (block.length + used > limit && title.length > 24) {
      title = truncateText(title, Math.max(24, Math.floor(title.length * 0.8)));
      const rebuilt = buildItemLink(item.url, title);
      block = `${index + 1}. <b>${sourceBadge}</b> ${rebuilt}${why}`;
    }

    if (block.length + used > limit) {
      // Still too long: drop the explanation and try again.
      const withoutWhy = `${index + 1}. <b>${sourceBadge}</b> ${buildItemLink(item.url, title)}`;
      if (withoutWhy.length + used > limit) break;
      block = withoutWhy;
    }

    blocks.push(block);
    used += block.length + 2;
  }

  const message = `${header}${intro}${blocks.join("\n\n")}${footer}`;

  if (message.length <= limit && hasBalancedTelegramTags(message)) {
    return message;
  }

  // Last resort: a caption without any markup, so that Telegram never has to
  // parse an unbalanced document.
  const plain = [
    `First Cup Tech — Daily Brief (${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date())})`,
    payload.title || "",
    ...payload.items
      .slice(0, maxItems)
      .map(
        (item, index) =>
          `${index + 1}. [${item.source.toUpperCase()}] ${item.title}\n   ${item.url}`,
      ),
  ]
    .filter(Boolean)
    .join("\n\n");

  return plain.length <= limit ? plain : plain.slice(0, limit);
}

/**
 * Render the link of an item.
 *
 * The URL comes from an RSS feed and is therefore attacker controlled: it is
 * only used when it is an http(s) URL, and it is HTML escaped before it is
 * interpolated into the `href` attribute.
 */
function buildItemLink(url: string | undefined | null, title: string): string {
  const safeTitle = escapeTelegramHtml(title);
  if (!url || !isSafeHttpUrl(url)) {
    return safeTitle;
  }
  return `<a href="${escapeTelegramHtml(url)}">${safeTitle}</a>`;
}

export class TelegramDeliveryAdapter implements DeliveryChannelAdapter {
  readonly channel = "telegram" as const;

  get isConfigured(): boolean {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    return Boolean(token && !token.includes("your-") && token.trim().length > 0);
  }

  get botUsername(): string {
    return process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") || "first_cup_tech_bot";
  }

  generateConnectUrl(userId: string): string {
    return `https://t.me/${this.botUsername}?start=${encodeURIComponent(userId)}`;
  }

  formatCaption(payload: AudioBriefDeliveryPayload): string {
    const dateStr = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date());

    const header = `☕ <b>First Cup Tech — Daily Brief</b> (${dateStr})\n`;
    const intro = `<i>${escapeTelegramHtml(truncateText(payload.title || "Your executive morning tech brief", 140))}</i>\n\n`;
    const footer =
      "\n\n🎙️ <i>Listen to the 3-min audio attached above. Have a high-impact build day!</i>";

    return buildTelegramMessage(payload, {
      limit: TELEGRAM_CAPTION_LIMIT,
      footer,
      includeWhy: true,
      maxItems: 5,
      intro,
      header,
    });
  }

  formatTextDigest(payload: TextBriefDeliveryPayload | AudioBriefDeliveryPayload): string {
    const dateStr = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date());

    const header = `☕ <b>First Cup Tech — Daily Brief</b> (${dateStr})\n`;
    const intro = `<i>${escapeTelegramHtml(truncateText(payload.title || "Your executive morning tech brief", 140))}</i>\n\n`;
    const footer =
      "\n\n📝 <i>Here is your executive morning tech briefing. Have a high-impact build day!</i>";

    return buildTelegramMessage(payload, {
      limit: TELEGRAM_TEXT_LIMIT,
      footer,
      includeWhy: false,
      maxItems: 5,
      intro,
      header,
    });
  }

  async sendText(payload: TextBriefDeliveryPayload): Promise<DeliveryResult> {
    assertTelegramConfigured();

    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!this.isConfigured || !token) {
      workerLogger.info(
        { recipientId: payload.recipientId, itemsCount: payload.items.length },
        "[telegram:mock] Sending mock text briefing to Telegram",
      );
      return {
        success: true,
        messageId: `mock-tg-text-${Date.now()}`,
        channel: "telegram",
        deliveredAs: "text_only",
      };
    }

    try {
      const text = this.formatTextDigest(payload);
      const apiUrl = `https://api.telegram.org/bot${token}/sendMessage`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: payload.recipientId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: false,
        }),
        signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
      });

      let data: TelegramApiResponse;
      try {
        data = (await response.json()) as TelegramApiResponse;
      } catch {
        data = {
          ok: false,
          description: `HTTP ${response.status} Non-JSON response`,
        };
      }

      if (!response.ok || !data.ok) {
        const errorDescription = data.description || `HTTP ${response.status}`;
        const classification = classifyTelegramError(response.status, errorDescription);
        workerLogger.error({ errorDescription, status: response.status }, "[telegram:text_error]");
        return {
          success: false,
          channel: "telegram",
          errorMessage: errorDescription,
          deliveredAs: "text_only",
          statusCode: response.status,
          errorCode: classification.errorCode,
          isPermanentFailure: classification.isPermanentFailure,
        };
      }

      workerLogger.info(
        { recipientId: payload.recipientId, messageId: data.result?.message_id },
        "[telegram] Text briefing delivered successfully",
      );

      return {
        success: true,
        messageId: String(data.result?.message_id),
        channel: "telegram",
        deliveredAs: "text_only",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Telegram error";
      workerLogger.error({ message }, "[telegram:text_exception]");
      return {
        success: false,
        channel: "telegram",
        errorMessage: message,
        errorCode: "NETWORK_ERROR",
        isPermanentFailure: false,
        deliveredAs: "text_only",
      };
    }
  }

  async sendAudio(payload: AudioBriefDeliveryPayload): Promise<DeliveryResult> {
    assertTelegramConfigured();

    if (!payload.audioUrl) {
      workerLogger.info("[telegram] No audioUrl provided, falling back to text briefing");
      return this.sendText(payload);
    }

    const audioUrl = payload.audioUrl;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!this.isConfigured || !token) {
      workerLogger.info(
        { recipientId: payload.recipientId, audioUrl },
        "[telegram:mock] Sending mock audio briefing to Telegram",
      );
      return {
        success: true,
        messageId: `mock-tg-audio-${Date.now()}`,
        channel: "telegram",
        deliveredAs: "audio",
      };
    }

    try {
      const caption = this.formatCaption(payload);
      const apiUrl = `https://api.telegram.org/bot${token}/sendAudio`;

      // If URL is local/private, fetch bytes server-side and upload via multipart FormData
      if (isLocalOrPrivateUrl(audioUrl)) {
        workerLogger.info(
          { audioUrl },
          "[telegram] Local/internal audio URL detected — downloading buffer for upload",
        );
        const audioBuffer = await this.readAudioBytes(audioUrl);
        if (audioBuffer) {
          return await this.uploadAudioFormData(apiUrl, payload, audioBuffer, caption);
        }
      }

      // Public URL direct post
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: payload.recipientId,
          audio: audioUrl,
          caption,
          parse_mode: "HTML",
          title: payload.title || "First Cup Tech Morning Brief",
          performer: "First Cup Tech",
          duration: payload.durationSec,
        }),
        signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
      });

      let data: TelegramApiResponse;
      try {
        data = (await response.json()) as TelegramApiResponse;
      } catch {
        data = {
          ok: false,
          description: `HTTP ${response.status} Non-JSON response`,
        };
      }

      if (!response.ok || !data.ok) {
        const errorDescription = data.description || `HTTP ${response.status}`;
        const classification = classifyTelegramError(response.status, errorDescription);

        if (classification.isPermanentFailure) {
          return {
            success: false,
            channel: "telegram",
            errorMessage: errorDescription,
            statusCode: response.status,
            errorCode: classification.errorCode,
            isPermanentFailure: true,
          };
        }

        workerLogger.warn(
          { errorDescription },
          "[telegram] Direct audio URL failed, attempting buffer fallback",
        );
        const audioBuffer = await this.readAudioBytes(audioUrl);
        if (audioBuffer) {
          const formResult = await this.uploadAudioFormData(apiUrl, payload, audioBuffer, caption);
          if (formResult.success || formResult.isPermanentFailure) {
            return formResult;
          }
        }

        // Tertiary fallback: Text message
        workerLogger.warn("[telegram] Audio dispatch failed, falling back to rich text message");
        return this.sendText(payload);
      }

      return {
        success: true,
        messageId: String(data.result?.message_id),
        channel: "telegram",
        deliveredAs: "audio",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown audio dispatch error";
      workerLogger.warn(
        { message },
        "[telegram:exception] Audio dispatch failed, falling back to text",
      );
      return this.sendText(payload);
    }
  }

  private async readAudioBytes(audioUrl: string): Promise<Buffer | null> {
    try {
      if (audioUrl.startsWith("/")) {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const localPath = path.resolve(process.cwd(), audioUrl.replace(/^\//, ""));
        if (fs.existsSync(localPath)) {
          return await fs.promises.readFile(localPath);
        }
      }

      const res = await fetch(audioUrl, {
        signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
      });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
    } catch (err) {
      workerLogger.warn(
        { err, audioUrl },
        "[telegram] Failed to fetch audio bytes for direct upload",
      );
    }
    return null;
  }

  private async uploadAudioFormData(
    apiUrl: string,
    payload: AudioBriefDeliveryPayload,
    audioBytes: Buffer,
    caption: string,
  ): Promise<DeliveryResult> {
    try {
      const form = new FormData();
      form.append("chat_id", payload.recipientId);
      const audioBlob = new Blob([new Uint8Array(audioBytes)], {
        type: "audio/mpeg",
      });
      form.append("audio", audioBlob, "briefing.mp3");
      form.append("caption", caption);
      form.append("parse_mode", "HTML");
      form.append("title", payload.title || "First Cup Tech Morning Brief");
      form.append("performer", "First Cup Tech");
      if (payload.durationSec) {
        form.append("duration", String(payload.durationSec));
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
      });

      let data: TelegramApiResponse;
      try {
        data = (await response.json()) as TelegramApiResponse;
      } catch {
        data = {
          ok: false,
          description: `HTTP ${response.status} Non-JSON response`,
        };
      }

      if (!response.ok || !data.ok) {
        const errorDescription = data.description || `HTTP ${response.status}`;
        const classification = classifyTelegramError(response.status, errorDescription);
        return {
          success: false,
          channel: "telegram",
          errorMessage: errorDescription,
          statusCode: response.status,
          errorCode: classification.errorCode,
          isPermanentFailure: classification.isPermanentFailure,
        };
      }

      return {
        success: true,
        messageId: String(data.result?.message_id),
        channel: "telegram",
        deliveredAs: "audio",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Multipart upload error";
      return {
        success: false,
        channel: "telegram",
        errorMessage: message,
        errorCode: "NETWORK_ERROR",
        isPermanentFailure: false,
      };
    }
  }
}

export const telegramDelivery = new TelegramDeliveryAdapter();
