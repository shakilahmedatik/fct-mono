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
  /**
   * The tier the audio was stored in. `local` is a degraded result: the file
   * only exists on the worker machine and the URL only works when
   * `LOCAL_AUDIO_BASE_URL` points at a server that actually serves it.
   */
  storageTier: "s3" | "local";
  key: string;
}

export interface AudioProvider {
  readonly name: AudioProviderName;
  isConfigured(): boolean;
  synthesize(script: string, digestId: string): Promise<AudioSynthesisResult>;
}
