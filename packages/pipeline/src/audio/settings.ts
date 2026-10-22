// =============================================================================
// Audio Provider Settings & Registry Service
// Modeled directly after First Cup Tech v1 audio-settings & provider registry
// =============================================================================

export type AudioProviderId = "elevenlabs" | "deepgram" | "kokoro" | "openai";

export interface AudioSettings {
  provider: AudioProviderId;
  deepgramModel: string;
  elevenlabsVoiceId?: string;
  kokoroVoiceId?: string;
  openaiVoiceId?: string;
}

export interface AudioVoiceOption {
  id: string;
  name: string;
  description?: string;
}

export interface AudioProviderStatus {
  id: AudioProviderId;
  name: string;
  description: string;
  isConfigured: boolean;
  isAvailable: boolean;
  isActive: boolean;
  missingRequirements?: string[];
  activeModelOrVoice?: string;
  availableVoices: AudioVoiceOption[];
}

const isSet = (v?: string | null) => Boolean(v && !v.includes("your-") && v.trim().length > 0);

/**
 * PROCESS-LOCAL SETTINGS.
 *
 * The settings below live in a module level variable of the process that
 * called `saveAudioSettings`. They are:
 *
 *   * lost when the process restarts;
 *   * NOT visible to any other process (the worker never sees a setting saved
 *     by the API, and vice versa);
 *   * never written to the database — the database schema is owned by another
 *     team and no persistence is performed here.
 *
 * The read path deliberately falls through to the environment defaults on
 * every call, so a process that never saved anything still sees the
 * environment configuration.
 */
let memoryAudioSettingsCache: AudioSettings | null = null;

export function getDefaultAudioSettings(): AudioSettings {
  const envProvider = (process.env.AUDIO_PROVIDER || "").toLowerCase().trim();

  let provider: AudioProviderId = "elevenlabs";
  if (
    envProvider === "elevenlabs" ||
    envProvider === "deepgram" ||
    envProvider === "kokoro" ||
    envProvider === "openai"
  ) {
    provider = envProvider as AudioProviderId;
  } else if (isSet(process.env.ELEVENLABS_API_KEY)) {
    provider = "elevenlabs";
  } else if (isSet(process.env.DEEPGRAM_API_KEY)) {
    provider = "deepgram";
  } else {
    provider = "kokoro";
  }

  return {
    provider,
    deepgramModel: process.env.DEEPGRAM_MODEL || "aura-asteria-en",
    elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb",
    kokoroVoiceId: process.env.KOKORO_VOICE_ID || "af_bella",
    openaiVoiceId: process.env.OPENAI_VOICE_ID || "alloy",
  };
}

/**
 * Returns the effective audio settings for this process.
 *
 * Process local: see the note on `memoryAudioSettingsCache`. Synchronous
 * because it performs no I/O.
 */
export function getAudioSettings(): AudioSettings {
  if (memoryAudioSettingsCache) {
    return memoryAudioSettingsCache;
  }
  return getDefaultAudioSettings();
}

/**
 * Stores audio settings for this process only.
 *
 * Process local: see the note on `memoryAudioSettingsCache`. Synchronous
 * because it performs no I/O.
 */
export function saveAudioSettings(updates: Partial<AudioSettings>): AudioSettings {
  const current = getAudioSettings();
  const next: AudioSettings = {
    ...current,
    ...updates,
  };
  memoryAudioSettingsCache = next;
  return next;
}

export function getAudioProviderStatuses(settings: AudioSettings): AudioProviderStatus[] {
  const hasStorage =
    (isSet(process.env.STORAGE_ENDPOINT) || isSet(process.env.S3_ENDPOINT)) &&
    (isSet(process.env.STORAGE_BUCKET) || isSet(process.env.S3_BUCKET_NAME));

  const storageRequirements = hasStorage ? [] : ["STORAGE_ENDPOINT & BUCKET"];

  // ElevenLabs
  const hasElevenLabsKey = isSet(process.env.ELEVENLABS_API_KEY);
  const elevenlabsMissing = [
    ...(hasElevenLabsKey ? [] : ["ELEVENLABS_API_KEY"]),
    ...storageRequirements,
  ];

  // Deepgram Aura
  const hasDeepgramKey = isSet(process.env.DEEPGRAM_API_KEY);
  const deepgramMissing = [...(hasDeepgramKey ? [] : ["DEEPGRAM_API_KEY"]), ...storageRequirements];

  // OpenAI TTS
  const hasOpenAIKey = isSet(process.env.OPENAI_API_KEY);
  const openAiMissing = [...(hasOpenAIKey ? [] : ["OPENAI_API_KEY"]), ...storageRequirements];

  // Kokoro (local ONNX)
  const kokoroMissing = [...storageRequirements];

  const active = settings.provider;

  return [
    {
      id: "elevenlabs",
      name: "ElevenLabs TTS",
      description: "Ultra-expressive neural voice synthesis with multilingual fidelity.",
      isConfigured: hasElevenLabsKey,
      isAvailable: hasElevenLabsKey && hasStorage,
      isActive: active === "elevenlabs",
      missingRequirements: elevenlabsMissing,
      activeModelOrVoice:
        settings.elevenlabsVoiceId ||
        process.env.ELEVENLABS_VOICE_ID ||
        "George (JBFqnCBsd6RMkjVDRZzb)",
      availableVoices: [
        {
          id: "JBFqnCBsd6RMkjVDRZzb",
          name: "George",
          description: "Warm, authoritative British male",
        },
        {
          id: "21m00Tcm4TlvDq8ikWAM",
          name: "Rachel",
          description: "Calm, professional American female",
        },
        {
          id: "AZnzlk1XvdvUeBnXmlld",
          name: "Domi",
          description: "Strong, emphatic American female",
        },
        {
          id: "EXAVITQu4vr4xnSDxMaL",
          name: "Bella",
          description: "Warm, expressive American female",
        },
        { id: "ErXwobaYiN019PkySvjV", name: "Antoni", description: "Well-rounded American male" },
      ],
    },
    {
      id: "deepgram",
      name: "Deepgram Aura",
      description: "Enterprise conversational speech with ultra-low latency & natural pacing.",
      isConfigured: hasDeepgramKey,
      isAvailable: hasDeepgramKey && hasStorage,
      isActive: active === "deepgram",
      missingRequirements: deepgramMissing,
      activeModelOrVoice: settings.deepgramModel || process.env.DEEPGRAM_MODEL || "aura-asteria-en",
      availableVoices: [
        { id: "aura-asteria-en", name: "Asteria", description: "Crisp American female" },
        { id: "aura-luna-en", name: "Luna", description: "Warm American female" },
        { id: "aura-orion-en", name: "Orion", description: "Authoritative American male" },
        { id: "aura-arcas-en", name: "Arcas", description: "Confident American male" },
        { id: "aura-perseus-en", name: "Perseus", description: "Natural American male" },
      ],
    },
    {
      id: "kokoro",
      name: "Local Kokoro (ONNX)",
      description: "Self-hosted 82M open-weight model running locally without cloud API costs.",
      isConfigured: true,
      isAvailable: true,
      isActive: active === "kokoro",
      missingRequirements: kokoroMissing,
      activeModelOrVoice: settings.kokoroVoiceId || process.env.KOKORO_VOICE_ID || "af_bella",
      availableVoices: [
        { id: "af_bella", name: "Bella (af_bella)", description: "Expressive American female" },
        { id: "af_heart", name: "Heart (af_heart)", description: "Warm, clear American female" },
        { id: "am_adam", name: "Adam (am_adam)", description: "Dynamic American male" },
        { id: "am_michael", name: "Michael (am_michael)", description: "Smooth American male" },
        { id: "bf_emma", name: "Emma (bf_emma)", description: "British female narrator" },
        { id: "bm_george", name: "George (bm_george)", description: "British male narrator" },
      ],
    },
    {
      id: "openai",
      name: "OpenAI TTS",
      description:
        "High-definition neural speech from OpenAI (alloy, echo, fable, onyx, nova, shimmer).",
      isConfigured: hasOpenAIKey,
      isAvailable: hasOpenAIKey && hasStorage,
      isActive: active === "openai",
      missingRequirements: openAiMissing,
      activeModelOrVoice: settings.openaiVoiceId || "alloy",
      availableVoices: [
        { id: "alloy", name: "Alloy", description: "Neutral, balanced voice" },
        { id: "echo", name: "Echo", description: "Warm, conversational male" },
        { id: "fable", name: "Fable", description: "British expressive accent" },
        { id: "onyx", name: "Onyx", description: "Deep, authoritative male" },
        { id: "nova", name: "Nova", description: "Energetic, engaging female" },
        { id: "shimmer", name: "Shimmer", description: "Clear, optimistic female" },
      ],
    },
  ];
}

/**
 * Resolves the currently active audio provider according to system settings.
 * Falls back to other configured providers if the selected provider lacks credentials.
 */
export async function getActiveAudioSettings(): Promise<{
  provider: AudioProviderId;
  voiceId: string;
}> {
  const settings = getAudioSettings();
  const statuses = getAudioProviderStatuses(settings);
  const activeStatus = statuses.find((s) => s.id === settings.provider);

  if (activeStatus?.isConfigured) {
    let voiceId = "";
    if (activeStatus.id === "elevenlabs") {
      voiceId = settings.elevenlabsVoiceId || "JBFqnCBsd6RMkjVDRZzb";
    } else if (activeStatus.id === "deepgram") {
      voiceId = settings.deepgramModel || "aura-asteria-en";
    } else if (activeStatus.id === "kokoro") {
      voiceId = settings.kokoroVoiceId || "af_bella";
    } else if (activeStatus.id === "openai") {
      voiceId = settings.openaiVoiceId || "alloy";
    }
    return { provider: activeStatus.id, voiceId };
  }

  // Fallback order: elevenlabs -> deepgram -> kokoro
  const fallback = statuses.find((s) => s.isConfigured) || statuses.find((s) => s.id === "kokoro");
  const fallbackId = (fallback?.id || "kokoro") as AudioProviderId;

  return {
    provider: fallbackId,
    voiceId:
      fallbackId === "kokoro"
        ? settings.kokoroVoiceId || "af_bella"
        : fallbackId === "deepgram"
          ? settings.deepgramModel || "aura-asteria-en"
          : settings.elevenlabsVoiceId || "JBFqnCBsd6RMkjVDRZzb",
  };
}
