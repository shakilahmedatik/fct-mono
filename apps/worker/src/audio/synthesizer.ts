import { db, schema } from "@repo/db";
import { eq } from "drizzle-orm";
import { workerLogger } from "../lib/logger";
import { DeepgramProvider } from "./providers/deepgram";
import { ElevenLabsProvider } from "./providers/elevenlabs";
import { LocalKokoroProvider } from "./providers/kokoro";
import { uploadAudioBuffer } from "./storage/s3";
import type { AudioProvider, AudioSynthesisResult } from "./types";

const providers: AudioProvider[] = [
  new ElevenLabsProvider(),
  new DeepgramProvider(),
  new LocalKokoroProvider(),
];

export async function synthesizeAudioWithFailover(
  script: string,
  digestId: string,
): Promise<{
  audioUrl: string;
  provider: string;
  durationSec: number;
}> {
  if (!script || script.trim().length === 0) {
    throw new Error("Cannot synthesize empty audio script.");
  }

  let synthesisResult: AudioSynthesisResult | null = null;
  const attempts: Array<{ provider: string; error: string }> = [];

  for (const provider of providers) {
    if (!provider.isConfigured()) {
      continue;
    }

    try {
      workerLogger.info({ provider: provider.name, digestId }, "Attempting audio synthesis...");
      synthesisResult = await provider.synthesize(script, digestId);
      workerLogger.info({ provider: provider.name, digestId }, "Audio synthesis succeeded.");
      break;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      workerLogger.warn(
        { provider: provider.name, digestId, err: msg },
        "Provider synthesis failed, attempting next in cascade...",
      );
      attempts.push({ provider: provider.name, error: msg });
    }
  }

  if (!synthesisResult) {
    throw new Error(
      `All audio providers in failover cascade failed: ${attempts.map((a) => `${a.provider}: ${a.error}`).join("; ")}`,
    );
  }

  // Upload synthesized audio buffer to RustFS / S3 storage
  const storageResult = await uploadAudioBuffer(
    digestId,
    synthesisResult.buffer,
    synthesisResult.format,
  );

  // Upsert or update audioBrief in PostgreSQL
  const existingBrief = await db.query.audioBriefs.findFirst({
    where: eq(schema.audioBriefs.digestId, digestId),
  });

  if (existingBrief) {
    await db
      .update(schema.audioBriefs)
      .set({
        status: "ready",
        audioUrl: storageResult.audioUrl,
        durationSec: synthesisResult.durationSec,
        provider: synthesisResult.provider,
        updatedAt: new Date(),
      })
      .where(eq(schema.audioBriefs.digestId, digestId));
  } else {
    await db.insert(schema.audioBriefs).values({
      id: crypto.randomUUID(),
      digestId,
      status: "ready",
      script,
      audioUrl: storageResult.audioUrl,
      durationSec: synthesisResult.durationSec,
      provider: synthesisResult.provider,
      deliveryChannel: "telegram",
      deliveryStatus: "pending",
    });
  }

  workerLogger.info(
    {
      digestId,
      provider: synthesisResult.provider,
      audioUrl: storageResult.audioUrl,
      durationSec: synthesisResult.durationSec,
      tier: storageResult.storageTier,
    },
    "Audio brief synthesized and stored successfully.",
  );

  return {
    audioUrl: storageResult.audioUrl,
    provider: synthesisResult.provider,
    durationSec: synthesisResult.durationSec,
  };
}
