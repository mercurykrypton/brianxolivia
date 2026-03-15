import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@workspace/db";
import { verifyMuxWebhook, createSignedThumbnailUrl } from "@/lib/mux";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("mux-signature") ?? "";

  const isValid = await verifyMuxWebhook(body, signature);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const { type, data } = event;

  try {
    switch (type) {
      case "video.asset.ready": {
        const assetId = data.id;
        const playbackIds = data.playback_ids;
        const playbackId = playbackIds?.find((p: any) => p.policy === "signed")?.id
          ?? playbackIds?.[0]?.id;

        if (!playbackId) break;

        // Find PostMedia with this mux asset ID
        const media = await prisma.postMedia.findFirst({
          where: { muxAssetId: assetId },
        });

        if (media) {
          // Generate thumbnail
          const thumbnailUrl = await createSignedThumbnailUrl(playbackId, 60 * 60);

          await prisma.postMedia.update({
            where: { id: media.id },
            data: {
              muxPlaybackId: playbackId,
              duration: data.duration,
            },
          });
        }

        // Also check if there's a pending upload
        const upload = await prisma.postMedia.findFirst({
          where: { muxAssetId: data.upload_id },
        });

        if (upload) {
          await prisma.postMedia.update({
            where: { id: upload.id },
            data: {
              muxAssetId: assetId,
              muxPlaybackId: playbackId,
              duration: data.duration,
            },
          });
        }

        break;
      }

      case "video.asset.errored": {
        const assetId = data.id;
        console.error(`Mux asset ${assetId} errored:`, data.errors);

        // Update media record to indicate error
        await prisma.postMedia.updateMany({
          where: { muxAssetId: assetId },
          data: { mimeType: "error" }, // Temp hack - in prod would have a status field
        });
        break;
      }

      case "video.upload.asset_created": {
        const uploadId = data.id;
        const assetId = data.asset_id;

        // Update any media records waiting for this upload
        await prisma.postMedia.updateMany({
          where: { muxAssetId: uploadId },
          data: { muxAssetId: assetId },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Mux webhook error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
