// =============================================================================
// Audio Provider Registry & Definitions
// Supports: ElevenLabs, Deepgram Aura, OpenAI TTS, Kokoro, Google Cloud TTS, PlayHT
// =============================================================================

import type { GenerateOptions, KokoroTTS } from "kokoro-js";
import type {
  AudioGenerationRequest,
  AudioGenerationResult,
  AudioProviderDefinition,
} from "../types";

type KokoroVoice = NonNullable<GenerateOptions["voice"]>;

// ---------------------------------------------------------------------------
// Provider Definitions
// ---------------------------------------------------------------------------

export const AUDIO_PROVIDERS: AudioProviderDefinition[] = [
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    description: "High-fidelity voice synthesis with emotional range and multilingual support.",
    enabled: true,
    envKeyName: "ELEVENLABS_API_KEY",
    defaultVoice: "JBFqnCBsd6RMkjVDRZzb",
    voices: [
      {
        id: "JBFqnCBsd6RMkjVDRZzb",
        name: "George",
        description: "Warm British male",
        gender: "male",
        accent: "British",
      },
      {
        id: "EXAVITQu4vr4xnSDxMaL",
        name: "Sarah",
        description: "Soft American female",
        gender: "female",
        accent: "American",
      },
      {
        id: "onwK4e9ZLuTAKqWW03F9",
        name: "Daniel",
        description: "Authoritative British male",
        gender: "male",
        accent: "British",
      },
      {
        id: "pFZP5JQG7iQjIQuC4Bku",
        name: "Lily",
        description: "Warm British female",
        gender: "female",
        accent: "British",
      },
      {
        id: "TX3LPaxmHKxFdv7VOQHJ",
        name: "Liam",
        description: "Confident American male",
        gender: "male",
        accent: "American",
      },
    ],
    supportedFormats: ["mp3_44100_128", "mp3_22050_32", "pcm_16000", "pcm_24000"],
    freeTier: "10,000 characters/month free",
    website: "https://elevenlabs.io",
  },
  {
    id: "deepgram",
    name: "Deepgram Aura",
    description: "Ultra-low latency text-to-speech optimized for real-time applications.",
    enabled: true,
    envKeyName: "DEEPGRAM_API_KEY",
    defaultVoice: "aura-asteria-en",
    voices: [
      {
        id: "aura-asteria-en",
        name: "Asteria",
        description: "Professional female",
        gender: "female",
        accent: "American",
      },
      {
        id: "aura-luna-en",
        name: "Luna",
        description: "Soft female",
        gender: "female",
        accent: "American",
      },
      {
        id: "aura-stella-en",
        name: "Stella",
        description: "Warm female",
        gender: "female",
        accent: "American",
      },
      {
        id: "aura-athena-en",
        name: "Athena",
        description: "British female",
        gender: "female",
        accent: "British",
      },
      {
        id: "aura-hera-en",
        name: "Hera",
        description: "Authoritative female",
        gender: "female",
        accent: "American",
      },
      {
        id: "aura-orion-en",
        name: "Orion",
        description: "Deep male",
        gender: "male",
        accent: "American",
      },
      {
        id: "aura-arcas-en",
        name: "Arcas",
        description: "Confident male",
        gender: "male",
        accent: "American",
      },
      {
        id: "aura-perseus-en",
        name: "Perseus",
        description: "Natural male",
        gender: "male",
        accent: "American",
      },
      {
        id: "aura-angus-en",
        name: "Angus",
        description: "Irish male",
        gender: "male",
        accent: "Irish",
      },
      {
        id: "aura-orpheus-en",
        name: "Orpheus",
        description: "Warm male",
        gender: "male",
        accent: "American",
      },
      {
        id: "aura-helios-en",
        name: "Helios",
        description: "British male",
        gender: "male",
        accent: "British",
      },
      {
        id: "aura-zeus-en",
        name: "Zeus",
        description: "Authoritative male",
        gender: "male",
        accent: "American",
      },
    ],
    supportedFormats: ["mp3", "linear16", "mulaw", "alaw", "flac", "aac", "opus"],
    freeTier: "$200 free credits on signup",
    website: "https://deepgram.com",
  },
  {
    id: "openai",
    name: "OpenAI TTS",
    description: "Natural-sounding text-to-speech from OpenAI with HD quality option.",
    enabled: false,
    envKeyName: "OPENAI_API_KEY",
    defaultVoice: "nova",
    voices: [
      { id: "alloy", name: "Alloy", description: "Neutral and balanced", gender: "neutral" },
      { id: "ash", name: "Ash", description: "Warm and conversational", gender: "male" },
      { id: "coral", name: "Coral", description: "Clear and engaging", gender: "female" },
      { id: "echo", name: "Echo", description: "Deep and resonant", gender: "male" },
      {
        id: "fable",
        name: "Fable",
        description: "British storyteller",
        gender: "male",
        accent: "British",
      },
      { id: "nova", name: "Nova", description: "Energetic and warm", gender: "female" },
      { id: "onyx", name: "Onyx", description: "Authoritative", gender: "male" },
      { id: "sage", name: "Sage", description: "Calm and measured", gender: "female" },
      { id: "shimmer", name: "Shimmer", description: "Bright and clear", gender: "female" },
    ],
    supportedFormats: ["mp3", "opus", "aac", "flac", "wav", "pcm"],
    freeTier: "Pay-as-you-go ($15/1M chars TTS, $30/1M chars TTS-HD)",
    website: "https://platform.openai.com",
  },
  {
    id: "kokoro",
    name: "Kokoro",
    description:
      "Open-source TTS model — self-hosted, unlimited, no API key required. 82M params, Apache-2.0 license.",
    enabled: true,
    envKeyName: "KOKORO_API_URL",
    defaultVoice: "af_heart",
    voices: [
      {
        id: "af_heart",
        name: "Heart",
        description: "Warm American female",
        gender: "female",
        accent: "American",
      },
      {
        id: "af_star",
        name: "Star",
        description: "Clear American female",
        gender: "female",
        accent: "American",
      },
      {
        id: "am_adam",
        name: "Adam",
        description: "Natural American male",
        gender: "male",
        accent: "American",
      },
      {
        id: "am_michael",
        name: "Michael",
        description: "Professional American male",
        gender: "male",
        accent: "American",
      },
      {
        id: "bf_emma",
        name: "Emma",
        description: "British female",
        gender: "female",
        accent: "British",
      },
      {
        id: "bm_george",
        name: "George",
        description: "British male",
        gender: "male",
        accent: "British",
      },
    ],
    supportedFormats: ["wav", "mp3"],
    freeTier: "Fully free — self-hosted, Apache 2.0 license",
    website: "https://github.com/hexgrad/kokoro",
  },
  {
    id: "google",
    name: "Google Cloud TTS",
    description: "Google's WaveNet and Neural2 voices with broad language support.",
    enabled: false,
    envKeyName: "GOOGLE_APPLICATION_CREDENTIALS",
    defaultVoice: "en-US-Neural2-J",
    voices: [
      {
        id: "en-US-Neural2-J",
        name: "Neural2 J",
        description: "American male",
        gender: "male",
        accent: "American",
      },
      {
        id: "en-US-Neural2-C",
        name: "Neural2 C",
        description: "American female",
        gender: "female",
        accent: "American",
      },
      {
        id: "en-US-Neural2-D",
        name: "Neural2 D",
        description: "Deep American male",
        gender: "male",
        accent: "American",
      },
      {
        id: "en-US-Neural2-F",
        name: "Neural2 F",
        description: "Warm American female",
        gender: "female",
        accent: "American",
      },
      {
        id: "en-GB-Neural2-B",
        name: "Neural2 B",
        description: "British male",
        gender: "male",
        accent: "British",
      },
      {
        id: "en-GB-Neural2-A",
        name: "Neural2 A",
        description: "British female",
        gender: "female",
        accent: "British",
      },
    ],
    supportedFormats: ["mp3", "linear16", "ogg_opus", "mulaw", "alaw"],
    freeTier: "1M characters/month free (Standard), 1M chars free (WaveNet first month)",
    website: "https://cloud.google.com/text-to-speech",
  },
  {
    id: "playht",
    name: "PlayHT",
    description: "Ultra-realistic voice cloning and high-quality TTS with streaming support.",
    enabled: false,
    envKeyName: "PLAYHT_API_KEY",
    defaultVoice:
      "s3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json",
    voices: [
      {
        id: "s3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json",
        name: "Jennifer",
        description: "American female",
        gender: "female",
      },
      {
        id: "s3://voice-cloning-zero-shot/820da3d2-3a3b-42e7-844d-e68db835a206/male-cs/manifest.json",
        name: "Michael",
        description: "American male",
        gender: "male",
      },
    ],
    supportedFormats: ["mp3", "wav", "ogg", "flac", "mulaw"],
    freeTier: "12,500 characters/month free",
    website: "https://play.ht",
  },
];

// ---------------------------------------------------------------------------
// Audio Generation Functions
// ---------------------------------------------------------------------------

function chunkText(text: string, maxLength: number): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= maxLength) {
      currentChunk += `${sentence} `;
    } else {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = `${sentence} `;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks.length > 0 ? chunks : [text];
}

async function generateWithElevenLabs(
  request: AudioGenerationRequest,
): Promise<AudioGenerationResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

  const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
  const format = request.format || process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${request.voiceId}?output_format=${format}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: request.script,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
        },
      }),
    },
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`ElevenLabs API error (${res.status}): ${errorText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  return {
    provider: "elevenlabs",
    audioBuffer,
    format: "mp3",
    durationSec: Math.ceil((request.script.split(/\s+/).length / 150) * 60),
    sizeBytes: audioBuffer.length,
    voiceId: request.voiceId,
  };
}

async function generateWithDeepgram(
  request: AudioGenerationRequest,
): Promise<AudioGenerationResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY not configured");

  const model = request.voiceId || process.env.DEEPGRAM_MODEL || "aura-asteria-en";

  // Deepgram has a 2000 character limit per request, so we chunk the text.
  const chunks = chunkText(request.script, 1800);
  const audioBuffers: Buffer[] = [];

  for (const chunk of chunks) {
    const res = await fetch(`https://api.deepgram.com/v1/speak?model=${model}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: chunk }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Deepgram API error (${res.status}): ${errorText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    audioBuffers.push(Buffer.from(arrayBuffer));
  }

  // Concatenate MP3 buffers (works for mp3 and linear16 in sequence)
  const finalAudioBuffer = Buffer.concat(audioBuffers);

  return {
    provider: "deepgram",
    audioBuffer: finalAudioBuffer,
    format: "mp3",
    durationSec: Math.ceil((request.script.split(/\s+/).length / 150) * 60),
    sizeBytes: finalAudioBuffer.length,
    voiceId: model,
  };
}

async function generateWithOpenAI(request: AudioGenerationRequest): Promise<AudioGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: request.voiceId || "nova",
      input: request.script,
      response_format: request.format || "mp3",
      speed: request.speed || 1.0,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI TTS API error (${res.status}): ${errorText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  return {
    provider: "openai",
    audioBuffer,
    format: "mp3",
    durationSec: Math.ceil((request.script.split(/\s+/).length / 150) * 60),
    sizeBytes: audioBuffer.length,
    voiceId: request.voiceId || "nova",
  };
}

let kokoroTtsInstance: KokoroTTS | null = null;

async function generateWithKokoro(request: AudioGenerationRequest): Promise<AudioGenerationResult> {
  const { KokoroTTS } = await import("kokoro-js");
  const { WaveFile } = await import("wavefile");

  if (!kokoroTtsInstance) {
    console.log("Loading Kokoro TTS model (this might take a moment on first run)...");
    // "onnx-community/Kokoro-82M-v1.0-ONNX" is the recommended model ID for ONNX runtime
    kokoroTtsInstance = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
      dtype: "fp32",
    });
  }

  const voiceId = request.voiceId || "af_heart";
  // Kokoro processes text sequentially. We MUST chunk the text to prevent out-of-memory errors
  // which cause the OS to swap infinitely and fill up the entire storage disk.
  const chunks = chunkText(request.script, 400); // 400 chars is very safe for ONNX
  const audioArrays: Float32Array[] = [];
  let totalLength = 0;
  let sampleRate = 24000;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Generating Kokoro TTS chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
    const audioResult = await kokoroTtsInstance.generate(chunk, {
      voice: voiceId as KokoroVoice,
      speed: request.speed || 1.0,
    });

    if (audioResult.sampling_rate) sampleRate = audioResult.sampling_rate;
    audioArrays.push(audioResult.audio);
    totalLength += audioResult.audio.length;
  }

  // Concatenate all chunks into a single Float32Array
  const combinedAudio = new Float32Array(totalLength);
  let offset = 0;
  for (const arr of audioArrays) {
    combinedAudio.set(arr, offset);
    offset += arr.length;
  }

  // Convert Float32Array to 16-bit PCM for WAV
  const wav = new WaveFile();
  wav.fromScratch(1, sampleRate, "32f", combinedAudio);
  const audioBuffer = Buffer.from(wav.toBuffer());

  return {
    provider: "kokoro",
    audioBuffer,
    format: "wav",
    durationSec: Math.ceil(combinedAudio.length / sampleRate),
    sizeBytes: audioBuffer.length,
    voiceId,
  };
}

async function generateWithGoogle(request: AudioGenerationRequest): Promise<AudioGenerationResult> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_TTS_API_KEY not configured");

  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text: request.script },
      voice: {
        languageCode: "en-US",
        name: request.voiceId || "en-US-Neural2-J",
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: request.speed || 1.0,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google TTS API error (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as { audioContent: string };
  const audioBuffer = Buffer.from(data.audioContent, "base64");

  return {
    provider: "google",
    audioBuffer,
    format: "mp3",
    durationSec: Math.ceil((request.script.split(/\s+/).length / 150) * 60),
    sizeBytes: audioBuffer.length,
    voiceId: request.voiceId || "en-US-Neural2-J",
  };
}

async function generateWithPlayHT(request: AudioGenerationRequest): Promise<AudioGenerationResult> {
  const apiKey = process.env.PLAYHT_API_KEY;
  const userId = process.env.PLAYHT_USER_ID;
  if (!apiKey || !userId) throw new Error("PLAYHT_API_KEY and PLAYHT_USER_ID not configured");

  const res = await fetch("https://api.play.ht/api/v2/tts/stream", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-User-ID": userId,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: request.script,
      voice: request.voiceId,
      output_format: "mp3",
      speed: request.speed || 1.0,
      quality: "high",
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`PlayHT API error (${res.status}): ${errorText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  return {
    provider: "playht",
    audioBuffer,
    format: "mp3",
    durationSec: Math.ceil((request.script.split(/\s+/).length / 150) * 60),
    sizeBytes: audioBuffer.length,
    voiceId: request.voiceId,
  };
}

// ---------------------------------------------------------------------------
// Unified Generation Interface
// ---------------------------------------------------------------------------

const PROVIDER_HANDLERS: Record<
  string,
  (req: AudioGenerationRequest) => Promise<AudioGenerationResult>
> = {
  elevenlabs: generateWithElevenLabs,
  deepgram: generateWithDeepgram,
  openai: generateWithOpenAI,
  kokoro: generateWithKokoro,
  google: generateWithGoogle,
  playht: generateWithPlayHT,
};

export async function generateAudio(
  request: AudioGenerationRequest,
): Promise<AudioGenerationResult> {
  const handler = PROVIDER_HANDLERS[request.provider];
  if (!handler) {
    throw new Error(`Unknown audio provider: ${request.provider}`);
  }
  return handler(request);
}

export function getProviderDefinition(providerId: string): AudioProviderDefinition | undefined {
  return AUDIO_PROVIDERS.find((p) => p.id === providerId);
}

export function getEnabledProviders(): AudioProviderDefinition[] {
  return AUDIO_PROVIDERS.filter((p) => p.enabled);
}

export function isProviderConfigured(providerId: string): boolean {
  const provider = getProviderDefinition(providerId);
  if (!provider) return false;
  if (provider.id === "kokoro") {
    // Kokoro runs locally inside the process now via kokoro-js!
    return true;
  }
  return Boolean(process.env[provider.envKeyName]);
}
