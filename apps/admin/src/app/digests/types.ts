export interface AdminAudioBrief {
  id: string;
  status: "ready" | "processing" | "pending" | "failed" | string;
  script?: string | null;
  audioUrl?: string | null;
  durationSec?: number | null;
  provider?: string | null;
  deliveryChannel?: string | null;
}

export interface AdminDigestRow {
  id: string;
  title: string | null;
  status: "delivered" | "generated" | "pending" | "failed" | string;
  digestDate: string;
  isMaster: boolean;
  cohortKey?: string | null;
  user?: {
    name: string;
    email: string;
  } | null;
  audioBrief?: AdminAudioBrief | null;
}

export const PAGE_SIZE = 25;
