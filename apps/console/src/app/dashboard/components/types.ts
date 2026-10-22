export interface DigestItem {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string | null;
  whyItMatters: string | null;
  position: number;
  topics: string[];
  publishedAt?: string;
}

export interface AudioBrief {
  id: string;
  script: string | null;
  audioUrl: string | null;
  durationSec: number | null;
}

export interface DigestDetail {
  id: string;
  title: string | null;
  digestDate: string;
  items: DigestItem[];
  audioBrief?: AudioBrief | null;
}
