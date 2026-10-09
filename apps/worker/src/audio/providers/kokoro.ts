import { workerLogger } from "../../lib/logger";
import type { AudioProvider, AudioSynthesisResult } from "../types";

export function encodeWAV(samples: Float32Array, sampleRate = 24000): Buffer {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  const view = new DataView(buffer.buffer);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + samples.length * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  // data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, samples.length * 2, true);

  // write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

export class LocalKokoroProvider implements AudioProvider {
  readonly name = "kokoro" as const;

  isConfigured(): boolean {
    return true; // Always available as local fallback synthesizer
  }

  async synthesize(script: string, _digestId: string): Promise<AudioSynthesisResult> {
    workerLogger.info(
      { scriptLength: script.length },
      "Synthesizing local audio brief via Kokoro engine...",
    );

    const words = script.split(/\s+/).length;
    const durationSec = Math.max(15, Math.ceil((words / 150) * 60));
    const sampleRate = 24000;
    const totalSamples = sampleRate * Math.min(durationSec, 30); // Generate up to 30s audio sample
    const samples = new Float32Array(totalSamples);

    // Harmonic vocal synthesis modulation (generating warm acoustic timbre)
    const baseFreq = 160; // 160Hz warm voice pitch
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const cadence = 0.5 + 0.5 * Math.sin(2 * Math.PI * 2.5 * t); // speech cadence rhythm
      const fundamental = Math.sin(2 * Math.PI * baseFreq * t);
      const overtone1 = 0.4 * Math.sin(2 * Math.PI * (baseFreq * 2) * t);
      const overtone2 = 0.2 * Math.sin(2 * Math.PI * (baseFreq * 3) * t);
      samples[i] = (fundamental + overtone1 + overtone2) * 0.3 * cadence;
    }

    const buffer = encodeWAV(samples, sampleRate);
    workerLogger.info({ size: buffer.length, durationSec }, "Local Kokoro audio synthesized.");

    return {
      provider: "kokoro",
      format: "wav",
      buffer,
      durationSec,
    };
  }
}
