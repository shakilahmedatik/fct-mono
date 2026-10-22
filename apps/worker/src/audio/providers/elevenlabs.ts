import { workerLogger } from "../../lib/logger";
import type { AudioProvider, AudioSynthesisResult } from "../types";

const PRONUNCIATION_MAP: Record<string, string> = {
  PostgreSQL: "Postgres Q L",
  "Next.js": "Next J S",
  pgvector: "P G vector",
  Hono: "Hoh-no",
  LLMs: "L L M's",
  LLM: "L L M",
  MoE: "Mixture of Experts",
  RustFS: "Rust F S",
  Valkey: "Val-key",
  BullMQ: "Bull M Q",
  RPC: "R P C",
  TTS: "T T S",
};

export function normalizeScriptPronunciation(text: string): string {
  let normalized = text;
  for (const [target, replacement] of Object.entries(PRONUNCIATION_MAP)) {
    const regex = new RegExp(`\\b${target}\\b`, "g");
    normalized = normalized.replace(regex, replacement);
  }
  return normalized;
}

export class ElevenLabsProvider implements AudioProvider {
  readonly name = "elevenlabs" as const;

  isConfigured(): boolean {
    return Boolean(process.env.ELEVENLABS_API_KEY);
  }

  async synthesize(script: string, _digestId: string): Promise<AudioSynthesisResult> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY is not configured.");
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB"; // Default Adam voice
    const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
    const cleanedScript = normalizeScriptPronunciation(script);

    workerLogger.info(
      { voiceId, modelId, scriptLength: cleanedScript.length },
      "Synthesizing audio via ElevenLabs...",
    );

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanedScript,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(
        `ElevenLabs API returned ${response.status}: ${errBody || response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const words = script.split(/\s+/).length;
    const durationSec = Math.max(15, Math.ceil((words / 150) * 60));

    workerLogger.info({ size: buffer.length, durationSec }, "ElevenLabs audio synthesis complete.");

    return {
      provider: "elevenlabs",
      format: "mp3",
      buffer,
      durationSec,
    };
  }
}
