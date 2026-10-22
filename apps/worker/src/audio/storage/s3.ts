import fs from "node:fs";
import path from "node:path";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { workerLogger } from "../../lib/logger";
import type { AudioFormat, AudioStorageResult } from "../types";

let cachedS3Client: S3Client | null = null;
let bucketVerified = false;

export function getS3Config() {
  const endpoint =
    process.env.STORAGE_ENDPOINT || process.env.S3_ENDPOINT || "http://localhost:9000";
  const accessKeyId =
    process.env.STORAGE_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || "rustfsadmin";
  const secretAccessKey =
    process.env.STORAGE_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || "rustfspassword";
  const bucket = process.env.STORAGE_BUCKET || process.env.S3_BUCKET_NAME || "first-cup-tech-audio";
  const region = process.env.STORAGE_REGION || "us-east-1";
  const publicBaseUrl =
    process.env.STORAGE_PUBLIC_BASE_URL || `${endpoint.replace(/\/$/, "")}/${bucket}`;

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucket,
    region,
    publicBaseUrl,
  };
}

export function getS3Client(): S3Client {
  if (cachedS3Client) return cachedS3Client;

  const config = getS3Config();
  cachedS3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedS3Client;
}

export async function ensureBucketExists(client: S3Client, bucket: string): Promise<void> {
  if (bucketVerified) return;

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    bucketVerified = true;
  } catch (_err: unknown) {
    // If bucket doesn't exist, try to create it
    try {
      workerLogger.info({ bucket }, "Bucket not found. Creating bucket on RustFS / S3...");
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      bucketVerified = true;
      workerLogger.info({ bucket }, "Bucket created successfully.");
    } catch (createErr: unknown) {
      workerLogger.warn(
        { err: createErr instanceof Error ? createErr.message : String(createErr) },
        "Could not verify or create bucket; attempting upload regardless.",
      );
    }
  }
}

export async function uploadAudioBuffer(
  digestId: string,
  buffer: Buffer,
  format: AudioFormat = "mp3",
): Promise<AudioStorageResult> {
  const config = getS3Config();
  const key = `audio/${digestId}.${format}`;
  const contentType = format === "mp3" ? "audio/mpeg" : "audio/wav";

  // Tier 1: Upload to RustFS / S3 Object Storage
  try {
    const client = getS3Client();
    await ensureBucketExists(client, config.bucket);

    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    const audioUrl = `${config.publicBaseUrl.replace(/\/$/, "")}/${key}`;
    workerLogger.info(
      { audioUrl, size: buffer.length, key },
      "Audio uploaded to RustFS / S3 successfully.",
    );

    return {
      audioUrl,
      storageTier: "s3",
      key,
    };
  } catch (s3Error: unknown) {
    const s3Message = s3Error instanceof Error ? s3Error.message : String(s3Error);
    workerLogger.warn(
      { err: s3Message },
      "S3 upload failed. Falling back to local filesystem storage...",
    );

    // Tier 2: Local Filesystem Storage Fallback.
    //
    // The fallback is opt-in: without an explicit `LOCAL_AUDIO_BASE_URL` the
    // job fails instead of publishing a URL that points at the recipient's
    // own machine (http://localhost:3000/...) or at a sample recording that
    // has nothing to do with the briefing of this user.
    const localBaseUrl = process.env.LOCAL_AUDIO_BASE_URL?.trim();
    if (!localBaseUrl) {
      throw new Error(
        `Audio storage failed and no local fallback is configured (set LOCAL_AUDIO_BASE_URL to enable the local storage tier): ${s3Message}`,
      );
    }

    try {
      const localDir = path.resolve(process.cwd(), "public/audio");
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      const localFilePath = path.join(localDir, `${digestId}.${format}`);
      fs.writeFileSync(localFilePath, buffer);

      const localUrl = `${localBaseUrl.replace(/\/$/, "")}/${key}`;
      workerLogger.warn(
        { localUrl },
        "Audio stored on the local filesystem — the result is degraded",
      );

      return {
        audioUrl: localUrl,
        storageTier: "local",
        key,
      };
    } catch (localErr: unknown) {
      throw new Error(
        `Audio storage failed: S3 error: ${s3Message}; local storage error: ${
          localErr instanceof Error ? localErr.message : String(localErr)
        }`,
      );
    }
  }
}
