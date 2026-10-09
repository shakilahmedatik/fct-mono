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
    workerLogger.warn(
      { err: s3Error instanceof Error ? s3Error.message : String(s3Error) },
      "S3 upload failed. Falling back to local filesystem storage...",
    );

    // Tier 2: Local Filesystem Storage Fallback
    try {
      const localDir = path.resolve(process.cwd(), "public/audio");
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      const localFilePath = path.join(localDir, `${digestId}.${format}`);
      fs.writeFileSync(localFilePath, buffer);

      const localUrl = `http://localhost:3000/audio/${digestId}.${format}`;
      workerLogger.info({ localUrl }, "Audio saved to local filesystem fallback.");

      return {
        audioUrl: localUrl,
        storageTier: "local",
        key,
      };
    } catch (localErr: unknown) {
      workerLogger.error(
        { err: localErr instanceof Error ? localErr.message : String(localErr) },
        "Local filesystem storage failed. Returning public sample audio URL.",
      );

      // Tier 3: Sample Audio URL Fallback
      return {
        audioUrl: "https://storage.firstcup.tech/sample-brief.mp3",
        storageTier: "sample",
        key,
      };
    }
  }
}
