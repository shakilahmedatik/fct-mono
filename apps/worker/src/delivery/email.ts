import { Resend } from "resend";
import { workerLogger } from "../lib/logger";
import type {
  AudioBriefDeliveryPayload,
  DeliveryChannelAdapter,
  DeliveryErrorCode,
  DeliveryItemHighlight,
  DeliveryResult,
  TextBriefDeliveryPayload,
} from "./types";

export function sanitizeEmailLog(input: unknown): string {
  if (input === undefined || input === null) return "";
  let str: string;
  if (input instanceof Error) {
    str = input.stack || input.message;
  } else if (typeof input === "string") {
    str = input;
  } else {
    try {
      str = JSON.stringify(input) ?? String(input);
    } catch {
      str = String(input);
    }
  }

  return (str ?? "")
    .replace(/re_[A-Za-z0-9_-]{4,}/g, "re_***REDACTED***")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***REDACTED***")
    .replace(/(api[-_]?key\s*[:=]\s*['"]?)[A-Za-z0-9_-]+(['"]?)/gi, "$1***REDACTED***$2");
}

export function classifyEmailError(error: unknown): {
  errorCode: DeliveryErrorCode;
  isPermanentFailure: boolean;
} {
  const msg =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === "string"
        ? error.toLowerCase()
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message).toLowerCase()
          : "";

  if (msg.includes("domain") || msg.includes("not verified") || msg.includes("unverified")) {
    return { errorCode: "DOMAIN_NOT_VERIFIED", isPermanentFailure: true };
  }

  if (
    msg.includes("suppressed") ||
    msg.includes("bounced") ||
    msg.includes("blacklist") ||
    msg.includes("complaint")
  ) {
    return { errorCode: "RECIPIENT_SUPPRESSED", isPermanentFailure: true };
  }

  if (
    msg.includes("invalid email") ||
    msg.includes("validation_error") ||
    msg.includes("invalid recipient") ||
    msg.includes("missing recipient")
  ) {
    return { errorCode: "INVALID_RECIPIENT", isPermanentFailure: true };
  }

  if (msg.includes("rate limit") || msg.includes("too many requests") || msg.includes("429")) {
    return { errorCode: "RATE_LIMITED", isPermanentFailure: false };
  }

  if (
    msg.includes("timeout") ||
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("econnrefused")
  ) {
    return { errorCode: "NETWORK_ERROR", isPermanentFailure: false };
  }

  return { errorCode: "UNKNOWN", isPermanentFailure: false };
}

export function escapeEmailHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Every outbound Resend request is aborted after this many milliseconds. A
 * hung request would otherwise hold the BullMQ job lock past `lockDuration`,
 * BullMQ would declare the job stalled and run it again — a duplicate send.
 */
const RESEND_REQUEST_TIMEOUT_MS = 15_000;

/**
 * Mock deliveries are only used when they were explicitly requested.
 *
 * A missing API key used to be treated as "mock mode", which turned a typo in
 * an environment variable into a delivery system that reported 100% success
 * without sending anything.
 */
function isMockMode(): boolean {
  return process.env.DELIVERY_MOCK === "true";
}

function assertEmailConfigured(): void {
  if (isMockMode()) return;

  const key = process.env.RESEND_API_KEY;
  if (!key || key.includes("your-") || key.trim().length === 0) {
    throw new Error(
      "Resend API key is not configured (RESEND_API_KEY). Set DELIVERY_MOCK=true to send mock deliveries in development.",
    );
  }
}

export function renderEmailTemplate(
  title: string,
  greeting: string,
  items: DeliveryItemHighlight[],
  audioUrl?: string | null,
  durationSec?: number,
  unsubscribeUrl?: string | null,
): { html: string; text: string } {
  const dateStr = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const durationLabel = durationSec
    ? `${Math.floor(durationSec / 60)} min ${durationSec % 60}s`
    : "3 minutes";

  // Plain Text Version
  const textStoryLines = items.map((item, idx) => {
    return [
      `${idx + 1}. [${item.source.toUpperCase()}] ${item.title}`,
      `   Link: ${item.url}`,
      item.summary ? `   ${item.summary}` : null,
      item.whyItMatters ? `   Why it matters: ${item.whyItMatters}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  });

  const text = [
    `FIRST CUP TECH — ${dateStr.toUpperCase()}`,
    `========================================`,
    greeting,
    "",
    audioUrl ? `🎙️ Listen to your morning audio briefing: ${audioUrl} (${durationLabel})\n` : "",
    "TOP INTELLIGENCE SIGNALS:",
    "------------------------",
    textStoryLines.join("\n\n"),
    "",
    "Have a high-impact build day,",
    "The First Cup Tech Team",
    "https://firstcup.tech",
    unsubscribeUrl ? `\nUnsubscribe: ${unsubscribeUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // Rich WhatsApp-inspired HTML Version
  const storyHtmlCards = items
    .map((item, idx) => {
      const whyHtml = item.whyItMatters
        ? `<div style="margin-top: 8px; padding: 8px 12px; background-color: #f0fdf4; border-left: 3px solid #00a884; border-radius: 4px; font-size: 13px; color: #166534; line-height: 1.4;">
             <strong>Why it matters:</strong> ${escapeEmailHtml(item.whyItMatters)}
           </div>`
        : "";

      const summaryHtml = item.summary
        ? `<p style="margin: 6px 0 0 0; font-size: 14px; color: #4b5563; line-height: 1.5;">${escapeEmailHtml(item.summary)}</p>`
        : "";

      return `
        <div style="margin-bottom: 20px; padding: 16px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; background-color: #f3f4f6; color: #374151; border-radius: 4px;">
              ${escapeEmailHtml(item.source)}
            </span>
            <span style="font-size: 12px; color: #9ca3af; font-weight: 600;">#${idx + 1}</span>
          </div>
          <h3 style="margin: 0; font-size: 16px; font-weight: 600; line-height: 1.3;">
            <a href="${escapeEmailHtml(item.url)}" style="color: #0b141a; text-decoration: none;" target="_blank">
              ${escapeEmailHtml(item.title)} &rarr;
            </a>
          </h3>
          ${summaryHtml}
          ${whyHtml}
        </div>
      `;
    })
    .join("");

  const audioCtaHtml = audioUrl
    ? `
      <div style="margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, #111b21 0%, #202c33 100%); border-radius: 12px; text-align: center; color: #ffffff;">
        <span style="display: inline-block; font-size: 24px; margin-bottom: 6px;">☕ 🎙️</span>
        <h2 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 600; color: #ffffff;">Today's Audio Briefing Ready</h2>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #8696a0;">Synthesized executive breakdown &bull; ${durationLabel}</p>
        <a href="${escapeEmailHtml(audioUrl)}" style="display: inline-block; padding: 10px 24px; background-color: #00a884; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 24px; box-shadow: 0 4px 12px rgba(0,168,132,0.35);">
          ▶ Play Audio Brief
        </a>
      </div>
    `
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeEmailHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #efeae2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111b21;">
  <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
    <!-- Top Emerald Header Bar -->
    <div style="background-color: #00a884; padding: 20px 24px; color: #ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; color: #ffffff;">First Cup Tech</h1>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #d1fae5; font-weight: 500;">Executive Morning Intelligence</p>
          </td>
          <td align="right">
            <span style="font-size: 12px; background-color: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-weight: 600;">
              ${escapeEmailHtml(dateStr)}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Main Content Container -->
    <div style="padding: 24px; background-color: #f7f8fa;">
      <p style="margin: 0 0 18px 0; font-size: 15px; color: #374151; line-height: 1.5;">
        ${escapeEmailHtml(greeting)}
      </p>

      ${audioCtaHtml}

      <div style="margin-bottom: 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280;">
        Top Stories & Technical Signals
      </div>

      ${storyHtmlCards}

      <!-- Bottom Signature -->
      <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; text-align: center;">
        <p style="margin: 0 0 6px 0;">Have a high-impact build day!</p>
        <p style="margin: 0; font-size: 12px;">
          <a href="https://app.firstcup.tech" style="color: #00a884; text-decoration: none; font-weight: 600;">Dashboard</a> &bull;
          <a href="https://app.firstcup.tech/settings" style="color: #00a884; text-decoration: none; font-weight: 600;">Preferences</a> &bull;
          <a href="https://firstcup.tech" style="color: #00a884; text-decoration: none; font-weight: 600;">First Cup Tech</a>
        </p>
        ${
          unsubscribeUrl
            ? `<p style="margin: 10px 0 0 0; font-size: 11px; color: #9ca3af;">
                 <a href="${escapeEmailHtml(unsubscribeUrl)}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from these emails</a>
               </p>`
            : ""
        }
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return { html, text };
}

export class EmailDeliveryAdapter implements DeliveryChannelAdapter {
  readonly channel = "email" as const;

  get isConfigured(): boolean {
    const key = process.env.RESEND_API_KEY;
    return Boolean(key && !key.includes("your-") && key.trim().length > 0);
  }

  get sender(): string {
    return process.env.RESEND_FROM || "First Cup Tech <brief@firstcup.tech>";
  }

  async sendText(payload: TextBriefDeliveryPayload): Promise<DeliveryResult> {
    const recipientEmail = payload.recipientId;

    assertEmailConfigured();

    if (!this.isConfigured) {
      workerLogger.info(
        { recipientEmail, title: payload.title },
        "[email:mock] Sending mock text briefing email",
      );
      return {
        success: true,
        messageId: `mock-email-text-${Date.now()}`,
        channel: "email",
        deliveredAs: "text_only",
      };
    }

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const subject = payload.title || "First Cup Tech — Morning Executive Brief";
      const greeting =
        payload.caption ||
        `Good morning ${payload.recipientName || ""}. Here is your tech intelligence briefing for today:`;

      const { html, text } = renderEmailTemplate(subject, greeting, payload.items, null);

      const { data, error } = await resend.emails.send(
        {
          from: this.sender,
          to: recipientEmail,
          subject,
          text,
          html,
        },
        { signal: AbortSignal.timeout(RESEND_REQUEST_TIMEOUT_MS) },
      );

      if (error) {
        const sanitizedMsg = sanitizeEmailLog(error.message || "Resend send failed");
        const classification = classifyEmailError(error.message);
        workerLogger.error({ error: sanitizedMsg }, "[email] Resend send error");
        return {
          success: false,
          channel: "email",
          errorMessage: sanitizedMsg,
          errorCode: classification.errorCode,
          isPermanentFailure: classification.isPermanentFailure,
          deliveredAs: "text_only",
        };
      }

      workerLogger.info(
        { recipientEmail, emailId: data?.id },
        "[email] Text briefing email sent successfully",
      );
      return {
        success: true,
        messageId: data?.id || `email-${Date.now()}`,
        channel: "email",
        deliveredAs: "text_only",
      };
    } catch (err) {
      const sanitizedMsg = sanitizeEmailLog(
        err instanceof Error ? err.message : "Unknown email dispatch error",
      );
      const classification = classifyEmailError(sanitizedMsg);
      workerLogger.error({ error: sanitizedMsg }, "[email:exception]");
      return {
        success: false,
        channel: "email",
        errorMessage: sanitizedMsg,
        errorCode: classification.errorCode,
        isPermanentFailure: classification.isPermanentFailure,
        deliveredAs: "text_only",
      };
    }
  }

  async sendAudio(payload: AudioBriefDeliveryPayload): Promise<DeliveryResult> {
    const recipientEmail = payload.recipientId;

    assertEmailConfigured();

    if (!this.isConfigured) {
      workerLogger.info(
        { recipientEmail, audioUrl: payload.audioUrl },
        "[email:mock] Sending mock audio briefing email",
      );
      return {
        success: true,
        messageId: `mock-email-audio-${Date.now()}`,
        channel: "email",
        deliveredAs: payload.audioUrl ? "audio" : "text_only",
      };
    }

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const subject = payload.title || "First Cup Tech — Morning Audio Brief & Digest";
      const greeting =
        payload.caption ||
        `Good morning ${payload.recipientName || ""}. Your audio briefing and top industry signals are ready:`;

      const { html, text } = renderEmailTemplate(
        subject,
        greeting,
        payload.items,
        payload.audioUrl,
        payload.durationSec,
        payload.unsubscribeUrl,
      );

      const { data, error } = await resend.emails.send(
        {
          from: this.sender,
          to: recipientEmail,
          subject,
          text,
          html,
        },
        { signal: AbortSignal.timeout(RESEND_REQUEST_TIMEOUT_MS) },
      );

      if (error) {
        const sanitizedMsg = sanitizeEmailLog(error.message || "Resend send failed");
        const classification = classifyEmailError(error.message);
        workerLogger.error({ error: sanitizedMsg }, "[email] Resend audio email send error");
        return {
          success: false,
          channel: "email",
          errorMessage: sanitizedMsg,
          errorCode: classification.errorCode,
          isPermanentFailure: classification.isPermanentFailure,
          deliveredAs: payload.audioUrl ? "audio" : "text_only",
        };
      }

      workerLogger.info(
        { recipientEmail, emailId: data?.id },
        "[email] Audio briefing email sent successfully",
      );
      return {
        success: true,
        messageId: data?.id || `email-audio-${Date.now()}`,
        channel: "email",
        deliveredAs: payload.audioUrl ? "audio" : "text_only",
      };
    } catch (err) {
      const sanitizedMsg = sanitizeEmailLog(
        err instanceof Error ? err.message : "Unknown email dispatch error",
      );
      const classification = classifyEmailError(sanitizedMsg);
      workerLogger.error({ error: sanitizedMsg }, "[email:exception]");
      return {
        success: false,
        channel: "email",
        errorMessage: sanitizedMsg,
        errorCode: classification.errorCode,
        isPermanentFailure: classification.isPermanentFailure,
      };
    }
  }
}

export const emailDelivery = new EmailDeliveryAdapter();
