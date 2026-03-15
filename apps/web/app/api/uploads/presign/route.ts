import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createPresignedUploadUrl,
  generateR2Key,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_SIZE,
  type R2MediaFolder,
} from "@/lib/r2";
import { createMuxUploadUrl } from "@/lib/mux";
import { prisma } from "@workspace/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { filename, contentType, folder, usesMux } = body as {
    filename: string;
    contentType: string;
    folder: R2MediaFolder;
    usesMux?: boolean;
  };

  if (!filename || !contentType || !folder) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Validate file type
  const isImage = ALLOWED_IMAGE_TYPES.includes(contentType);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(contentType);

  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  // Get user's DB ID
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    if (isVideo && usesMux) {
      // Use Mux for video uploads
      const { uploadUrl, uploadId } = await createMuxUploadUrl({
        corsOrigin: process.env.NEXT_PUBLIC_APP_URL ?? "*",
      });

      return NextResponse.json({
        type: "mux",
        uploadUrl,
        uploadId,
      });
    } else {
      // Use R2 for image uploads
      const key = generateR2Key(folder, user.id, filename);
      const { uploadUrl, expiresAt } = await createPresignedUploadUrl({
        key,
        contentType,
        maxSizeBytes: MAX_IMAGE_SIZE,
        expiresInSeconds: 3600,
      });

      return NextResponse.json({
        type: "r2",
        uploadUrl,
        key,
        expiresAt,
      });
    }
  } catch (err) {
    console.error("Presign error:", err);
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }
}
