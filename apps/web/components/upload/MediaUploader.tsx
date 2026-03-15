"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, CheckCircle, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { bytesToSize } from "@/lib/utils";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/lib/r2";

interface UploadedFile {
  file: File;
  r2Key?: string;
  previewUrl: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
}

interface MediaUploaderProps {
  onUpload: (
    media: Array<{
      type: "IMAGE";
      r2Key: string;
      blurHash?: string;
    }>
  ) => void;
  maxFiles?: number;
  className?: string;
}

export function MediaUploader({
  onUpload,
  maxFiles = 10,
  className,
}: MediaUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const uploadFile = async (file: File, index: number) => {
    setFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, status: "uploading" } : f
      )
    );

    try {
      // Get presigned URL
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          folder: "posts",
        }),
      });

      if (!presignRes.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, key } = await presignRes.json();

      // Upload to R2
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, status: "done", r2Key: key, progress: 100 } : f
        )
      );

      return { type: "IMAGE" as const, r2Key: key };
    } catch (err) {
      console.error("Upload error:", err);
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, status: "error" } : f
        )
      );
      return null;
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        status: "pending",
        progress: 0,
      }));

      const startIndex = files.length;
      setFiles((prev) => [...prev, ...newFiles]);

      // Upload all files
      const results = await Promise.all(
        newFiles.map((_, i) => uploadFile(newFiles[i]!.file, startIndex + i))
      );

      const uploaded = results.filter(Boolean) as Array<{
        type: "IMAGE";
        r2Key: string;
      }>;

      if (uploaded.length > 0) {
        onUpload(uploaded);
      }
    },
    [files, onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": ALLOWED_IMAGE_TYPES.map((t) => t.replace("image/", ".")),
    },
    maxFiles: maxFiles - files.length,
    maxSize: MAX_IMAGE_SIZE,
    disabled: files.length >= maxFiles,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone */}
      {files.length < maxFiles && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
            isDragActive
              ? "border-pink-500 bg-pink-500/10"
              : "border-border hover:border-pink-500/50 hover:bg-secondary"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">
            {isDragActive ? "Drop images here" : "Drag & drop or click to upload"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG, WebP up to {bytesToSize(MAX_IMAGE_SIZE)}
          </p>
        </div>
      )}

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {files.map((file, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-secondary">
              <img
                src={file.previewUrl}
                alt=""
                className={cn(
                  "w-full h-full object-cover transition-opacity",
                  file.status === "uploading" && "opacity-50"
                )}
              />

              {/* Status overlay */}
              {file.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}

              {file.status === "done" && (
                <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}

              {file.status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <p className="text-white text-xs">Failed</p>
                </div>
              )}

              {/* Remove button */}
              <button
                onClick={() => removeFile(i)}
                className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
