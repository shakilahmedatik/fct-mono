import { workerLogger } from "../../lib/logger";
import type { AudioProvider, AudioSynthesisResult } from "../types";

export class DeepgramProvider implements AudioProvider {
  readonly name = "deepgram" as const;

  isConfigured(): boolean {
    return Boolean(process.env.DEEPGRAM_API_KEY);
  }

  async synthesize(script: string, _digestId: string): Promise<AudioSynthesisResult> {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPGRAM_API_KEY is not configured.");
    }

    const model = process.env.DEEPGRAM_MODEL || "aura-asteria-en";
    workerLogger.info({ model, scriptLength: script.length }, "Synthesizing audio via Deepgram...");

    const url = `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=mp3`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: script }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(
        `Deepgram API returned ${response.status}: ${errBody || response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const words = script.split(/\s+/).length;
    const durationSec = Math.max(15, Math.ceil((words / 150) * 60));

    workerLogger.info({ size: buffer.length, durationSec }, "Deepgram audio synthesis complete.");

    return {
      provider: "deepgram",
      format: "mp3",
      buffer,
      durationSec,
    };
  }
}
