"use client";

import { useState, useCallback } from "react";

export interface UploadProgress {
  filename: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  r2Key?: string;
  muxUploadId?: string;
  error?: string;
}

export function useMediaUpload() {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadToR2 = useCallback(
    async (
      file: File,
      folder: string = "posts"
    ): Promise<{ key: string; publicUrl: string } | null> => {
      const id = uploads.length;
      setUploads((prev) => [
        ...prev,
        { filename: file.name, progress: 0, status: "uploading" },
      ]);
      setIsUploading(true);

      try {
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            folder,
          }),
        });

        if (!presignRes.ok) throw new Error("Failed to get upload URL");
        const { uploadUrl, key } = await presignRes.json();

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setUploads((prev) =>
                prev.map((u, i) =>
                  i === id ? { ...u, progress: pct } : u
                )
              );
            }
          };
          xhr.onload = () => xhr.status < 300 ? resolve() : reject();
          xhr.onerror = reject;
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        setUploads((prev) =>
          prev.map((u, i) =>
            i === id ? { ...u, status: "done", progress: 100, r2Key: key } : u
          )
        );

        const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;
        return { key, publicUrl };
      } catch (err) {
        setUploads((prev) =>
          prev.map((u, i) =>
            i === id ? { ...u, status: "error", error: "Upload failed" } : u
          )
        );
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [uploads]
  );

  const uploadToMux = useCallback(
    async (file: File): Promise<{ uploadId: string } | null> => {
      setIsUploading(true);
      const id = uploads.length;

      setUploads((prev) => [
        ...prev,
        { filename: file.name, progress: 0, status: "uploading" },
      ]);

      try {
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            folder: "posts",
            usesMux: true,
          }),
        });

        if (!presignRes.ok) throw new Error("Failed to get upload URL");
        const { uploadUrl, uploadId } = await presignRes.json();

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setUploads((prev) =>
                prev.map((u, i) => (i === id ? { ...u, progress: pct } : u))
              );
            }
          };
          xhr.onload = () => xhr.status < 300 ? resolve() : reject();
          xhr.onerror = reject;
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        setUploads((prev) =>
          prev.map((u, i) =>
            i === id
              ? { ...u, status: "done", progress: 100, muxUploadId: uploadId }
              : u
          )
        );

        return { uploadId };
      } catch (err) {
        setUploads((prev) =>
          prev.map((u, i) =>
            i === id ? { ...u, status: "error" } : u
          )
        );
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [uploads]
  );

  const clearUploads = useCallback(() => setUploads([]), []);

  return {
    uploads,
    isUploading,
    uploadToR2,
    uploadToMux,
    clearUploads,
  };
}
