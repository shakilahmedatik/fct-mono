export type AudioProviderName = "elevenlabs" | "deepgram" | "kokoro" | "sample";
export type AudioFormat = "mp3" | "wav";

export interface AudioSynthesisResult {
  provider: AudioProviderName;
  format: AudioFormat;
  buffer: Buffer;
  durationSec: number;
}

export interface AudioStorageResult {
  audioUrl: string;
  storageTier: "s3" | "local" | "sample";
  key: string;
}

export interface AudioProvider {
  readonly name: AudioProviderName;
  isConfigured(): boolean;
  synthesize(script: string, digestId: string): Promise<AudioSynthesisResult>;
}
