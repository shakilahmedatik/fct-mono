import { describe, expect, it } from "bun:test";
import { encodeWAV, LocalKokoroProvider } from "./providers/kokoro";

describe("Kokoro Local Audio Engine", () => {
  it("encodes valid 44-byte RIFF/WAVE header", () => {
    const samples = new Float32Array([0.0, 0.5, -0.5, 0.2]);
    const wavBuffer = encodeWAV(samples, 24000);

    expect(wavBuffer.length).toBe(44 + samples.length * 2);

    // RIFF magic string
    expect(wavBuffer.subarray(0, 4).toString("ascii")).toBe("RIFF");
    // WAVE format string
    expect(wavBuffer.subarray(8, 12).toString("ascii")).toBe("WAVE");
    // fmt chunk
    expect(wavBuffer.subarray(12, 16).toString("ascii")).toBe("fmt ");
    // data chunk
    expect(wavBuffer.subarray(36, 40).toString("ascii")).toBe("data");
  });

  it("synthesizes local fallback audio with expected duration", async () => {
    const provider = new LocalKokoroProvider();
    expect(provider.isConfigured()).toBe(true);

    const result = await provider.synthesize(
      "Good morning. This is First Cup Tech with your technical briefing.",
      "test-digest-1",
    );

    expect(result.provider).toBe("kokoro");
    expect(result.format).toBe("wav");
    expect(result.buffer.length).toBeGreaterThan(44);
    expect(result.durationSec).toBeGreaterThan(0);
  });
});
