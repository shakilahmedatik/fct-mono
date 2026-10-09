import { workerLogger } from "../lib/logger";
import type {
  AudioBriefDeliveryPayload,
  DeliveryChannelAdapter,
  DeliveryErrorCode,
  DeliveryResult,
  TextBriefDeliveryPayload,
} from "./types";

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

    const title = `☕ <b>First Cup Tech — Daily Brief</b> (${dateStr})\n`;
    const intro = `<i>${escapeTelegramHtml(payload.title || "Your executive morning tech brief")}</i>\n\n`;

    const highlights = payload.items
      .slice(0, 5)
      .map((item, idx) => {
        const sourceBadge = `[${escapeTelegramHtml(item.source.toUpperCase())}]`;
        const link = item.url
          ? `<a href="${item.url}">${escapeTelegramHtml(item.title)}</a>`
          : escapeTelegramHtml(item.title);
        const why = item.whyItMatters
          ? `\n   ↳ <i>${escapeTelegramHtml(item.whyItMatters)}</i>`
          : "";
        return `${idx + 1}. <b>${sourceBadge}</b> ${link}${why}`;
      })
      .join("\n\n");

    const footer =
      "\n\n🎙️ <i>Listen to the 3-min audio attached above. Have a high-impact build day!</i>";
    const fullCaption = `${title}${intro}${highlights}${footer}`;

    if (fullCaption.length <= 1024) {
      return fullCaption;
    }

    return `${title}${intro}${payload.items
      .slice(0, 3)
      .map((i, idx) => `${idx + 1}. <a href="${i.url}">${escapeTelegramHtml(i.title)}</a>`)
      .join("\n")}${footer}`.slice(0, 1020);
  }

  formatTextDigest(payload: TextBriefDeliveryPayload | AudioBriefDeliveryPayload): string {
    const dateStr = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date());

    const title = `☕ <b>First Cup Tech — Daily Brief</b> (${dateStr})\n`;
    const intro = `<i>${escapeTelegramHtml(payload.title || "Your executive morning tech brief")}</i>\n\n`;

    const highlights = payload.items
      .slice(0, 5)
      .map((item, idx) => {
        const sourceBadge = `[${escapeTelegramHtml(item.source.toUpperCase())}]`;
        const link = item.url
          ? `<a href="${item.url}">${escapeTelegramHtml(item.title)}</a>`
          : escapeTelegramHtml(item.title);
        const why = item.whyItMatters
          ? `\n   ↳ <i>${escapeTelegramHtml(item.whyItMatters)}</i>`
          : "";
        return `${idx + 1}. <b>${sourceBadge}</b> ${link}${why}`;
      })
      .join("\n\n");

    const footer =
      "\n\n📝 <i>Here is your executive morning tech briefing. Have a high-impact build day!</i>";
    const fullText = `${title}${intro}${highlights}${footer}`;

    if (fullText.length <= 4000) {
      return fullText;
    }

    const compactHighlights = payload.items
      .slice(0, 3)
      .map((item, idx) => {
        const sourceBadge = `[${escapeTelegramHtml(item.source.toUpperCase())}]`;
        const link = item.url
          ? `<a href="${item.url}">${escapeTelegramHtml(item.title)}</a>`
          : escapeTelegramHtml(item.title);
        return `${idx + 1}. <b>${sourceBadge}</b> ${link}`;
      })
      .join("\n\n");

    const compactText = `${title}${intro}${compactHighlights}${footer}`;
    if (compactText.length <= 4000) {
      return compactText;
    }

    return `${compactText.slice(0, 3990)}...`;
  }

  async sendText(payload: TextBriefDeliveryPayload): Promise<DeliveryResult> {
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

      const res = await fetch(audioUrl);
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
