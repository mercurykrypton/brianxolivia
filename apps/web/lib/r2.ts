import { AwsClient } from "aws4fetch";

const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "brianxolivia-media";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

function getR2Client(): AwsClient {
  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error("Missing R2 credentials");
  }
  return new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    region: "auto",
    service: "s3",
  });
}

export type R2MediaFolder =
  | "avatars"
  | "banners"
  | "posts"
  | "messages"
  | "thumbnails"
  | "requests";

// Generate a unique R2 key for a file
export function generateR2Key(
  folder: R2MediaFolder,
  userId: string,
  filename: string
): string {
  const timestamp = Date.now();
  const ext = filename.split(".").pop() ?? "bin";
  const safeName = filename
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/--+/g, "-")
    .toLowerCase();
  return `${folder}/${userId}/${timestamp}-${safeName}`;
}

// Create a presigned PUT URL for client-side upload
export async function createPresignedUploadUrl(params: {
  key: string;
  contentType: string;
  maxSizeBytes?: number;
  expiresInSeconds?: number;
}): Promise<{ uploadUrl: string; key: string; expiresAt: number }> {
  const r2 = getR2Client();
  const expiresIn = params.expiresInSeconds ?? 3600; // 1 hour to upload
  const url = new URL(
    `${R2_ENDPOINT}/${R2_BUCKET}/${params.key}`
  );

  url.searchParams.set("X-Amz-Expires", String(expiresIn));

  const signedRequest = await r2.sign(
    new Request(url.toString(), {
      method: "PUT",
      headers: {
        "Content-Type": params.contentType,
      },
    }),
    {
      aws: { signQuery: true },
    }
  );

  const expiresAt = Date.now() + expiresIn * 1000;
  return {
    uploadUrl: signedRequest.url,
    key: params.key,
    expiresAt,
  };
}

// Create a presigned GET URL (for private content, expires in 4h)
export async function createPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 4 * 60 * 60
): Promise<string> {
  const r2 = getR2Client();
  const url = new URL(`${R2_ENDPOINT}/${R2_BUCKET}/${key}`);
  url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));

  const signedRequest = await r2.sign(
    new Request(url.toString(), { method: "GET" }),
    { aws: { signQuery: true } }
  );

  return signedRequest.url;
}

// Get public URL (for public assets like avatars/banners)
export function getPublicUrl(key: string): string {
  if (!R2_PUBLIC_URL) {
    // Fall back to direct R2 URL (requires public bucket access)
    return `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;
  }
  return `${R2_PUBLIC_URL}/${key}`;
}

// Delete a file from R2
export async function deleteR2Object(key: string): Promise<void> {
  const r2 = getR2Client();
  const url = `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;

  const response = await r2.fetch(url, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete R2 object: ${response.statusText}`);
  }
}

// Delete multiple objects
export async function deleteR2Objects(keys: string[]): Promise<void> {
  await Promise.allSettled(keys.map((key) => deleteR2Object(key)));
}

// Check if an object exists
export async function r2ObjectExists(key: string): Promise<boolean> {
  const r2 = getR2Client();
  const url = `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;

  const response = await r2.fetch(url, { method: "HEAD" });
  return response.ok;
}

// Get object metadata
export async function getR2ObjectMetadata(key: string): Promise<{
  size: number;
  contentType: string;
  lastModified: Date;
} | null> {
  const r2 = getR2Client();
  const url = `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;

  const response = await r2.fetch(url, { method: "HEAD" });
  if (!response.ok) return null;

  return {
    size: parseInt(response.headers.get("content-length") ?? "0"),
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
    lastModified: new Date(response.headers.get("last-modified") ?? Date.now()),
  };
}

// Helper to determine if content should use private signed URL or public URL
export async function getMediaUrl(
  key: string,
  isPrivate: boolean
): Promise<string> {
  if (isPrivate) {
    return createPresignedDownloadUrl(key);
  }
  return getPublicUrl(key);
}

// Valid content types for upload
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
];

export const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
