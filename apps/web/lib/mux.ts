import Mux from "@mux/mux-node";

if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
  // Warn but don't throw at module load in dev
  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing Mux environment variables");
  }
}

export const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID ?? "dev",
  tokenSecret: process.env.MUX_TOKEN_SECRET ?? "dev",
});

// Create a direct upload URL for client-side upload
export async function createMuxUploadUrl(params?: {
  corsOrigin?: string;
  timeout?: number;
}): Promise<{ uploadUrl: string; uploadId: string }> {
  const upload = await mux.video.uploads.create({
    cors_origin: params?.corsOrigin ?? process.env.NEXT_PUBLIC_APP_URL ?? "*",
    new_asset_settings: {
      playback_policy: ["signed"],
      mp4_support: "capped-1080p",
      normalize_audio: true,
      master_access: "none",
      passthrough: JSON.stringify({ uploadedAt: new Date().toISOString() }),
    },
    timeout: params?.timeout ?? 3600,
  });

  return {
    uploadUrl: upload.url,
    uploadId: upload.id,
  };
}

// Get asset info
export async function getMuxAsset(assetId: string) {
  return mux.video.assets.retrieve(assetId);
}

// Delete asset
export async function deleteMuxAsset(assetId: string): Promise<void> {
  await mux.video.assets.delete(assetId);
}

// Create signed playback URL for paywalled content using Mux signing tokens
export async function createSignedPlaybackUrl(
  playbackId: string,
  expiration = 4 * 60 * 60 // 4 hours in seconds
): Promise<string> {
  const tokenId = process.env.MUX_SIGNING_KEY_ID;
  const tokenSecret = process.env.MUX_SIGNING_PRIVATE_KEY;

  if (!tokenId || !tokenSecret) {
    // Fall back to unsigned if no signing keys (dev mode)
    return `https://stream.mux.com/${playbackId}.m3u8`;
  }

  const token = await mux.jwt.signPlaybackId(playbackId, {
    keyId: tokenId,
    keySecret: tokenSecret,
    expiration: expiration,
    type: "video",
  });

  return `https://stream.mux.com/${playbackId}.m3u8?token=${token}`;
}

// Create signed thumbnail URL
export async function createSignedThumbnailUrl(
  playbackId: string,
  expiration = 4 * 60 * 60,
  options?: {
    time?: number;
    width?: number;
    height?: number;
  }
): Promise<string> {
  const tokenId = process.env.MUX_SIGNING_KEY_ID;
  const tokenSecret = process.env.MUX_SIGNING_PRIVATE_KEY;

  const params = new URLSearchParams();
  if (options?.time !== undefined) params.set("time", String(options.time));
  if (options?.width) params.set("width", String(options.width));
  if (options?.height) params.set("height", String(options.height));

  if (!tokenId || !tokenSecret) {
    return `https://image.mux.com/${playbackId}/thumbnail.jpg?${params}`;
  }

  const token = await mux.jwt.signPlaybackId(playbackId, {
    keyId: tokenId,
    keySecret: tokenSecret,
    expiration: expiration,
    type: "thumbnail",
  });

  params.set("token", token);
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?${params}`;
}

// Check if asset is ready to stream
export async function isAssetReady(assetId: string): Promise<boolean> {
  const asset = await getMuxAsset(assetId);
  return asset.status === "ready";
}

// Get upload from upload ID (to get asset ID after upload completes)
export async function getMuxUpload(uploadId: string) {
  return mux.video.uploads.retrieve(uploadId);
}

// Verify Mux webhook signature
export async function verifyMuxWebhook(
  payload: string,
  signature: string
): Promise<boolean> {
  const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
  if (!webhookSecret) return true; // skip in dev

  try {
    mux.webhooks.verifySignature(
      payload,
      { "mux-signature": signature },
      webhookSecret
    );
    return true;
  } catch {
    return false;
  }
}
