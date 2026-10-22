export type DeliveryChannel = "telegram" | "email" | "whatsapp";

export type DeliveryErrorCode =
  | "BOT_BLOCKED"
  | "CHAT_NOT_FOUND"
  | "INVALID_CHAT_ID"
  | "PARSE_ERROR"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "DOMAIN_NOT_VERIFIED"
  | "RECIPIENT_SUPPRESSED"
  | "INVALID_RECIPIENT"
  | "UNKNOWN";

export interface DeliveryItemHighlight {
  title: string;
  url: string;
  source: string;
  summary?: string | null;
  whyItMatters?: string | null;
}

export interface AudioBriefDeliveryPayload {
  recipientId: string;
  recipientName?: string;
  audioUrl?: string | null;
  durationSec?: number;
  title: string;
  caption?: string;
  items: DeliveryItemHighlight[];
  digestId?: string;
  userId?: string;
  /** Per-recipient unsubscribe link (newsletter subscribers only). */
  unsubscribeUrl?: string | null;
}

export interface TextBriefDeliveryPayload {
  recipientId: string;
  recipientName?: string;
  title: string;
  caption?: string;
  items: DeliveryItemHighlight[];
  digestId?: string;
  userId?: string;
}

export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  channel: DeliveryChannel;
  deliveredAs?: "audio" | "text_only";
  statusCode?: number;
  errorCode?: DeliveryErrorCode | string;
  errorMessage?: string;
  isPermanentFailure?: boolean;
}

export interface DeliveryChannelAdapter {
  readonly channel: DeliveryChannel;
  readonly isConfigured: boolean;
  sendAudio(payload: AudioBriefDeliveryPayload): Promise<DeliveryResult>;
  sendText(payload: TextBriefDeliveryPayload): Promise<DeliveryResult>;
}
