"use client";

import { useState, useRef } from "react";
import { Upload, Video, CheckCircle, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { bytesToSize } from "@/lib/utils";

interface VideoUploaderProps {
  onUpload: (data: {
    uploadId: string;
    assetId?: string;
    playbackId?: string;
  }) => void;
  className?: string;
}

type UploadStatus = "idle" | "uploading" | "processing" | "done" | "error";

export function VideoUploader({ onUpload, className }: VideoUploaderProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [filename, setFilename] = useState<string>("");
  const [uploadId, setUploadId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      alert("Please select a video file");
      return;
    }

    setFilename(file.name);
    setStatus("uploading");
    setProgress(0);

    try {
      // Get Mux upload URL
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
      const { uploadUrl, uploadId: muxUploadId } = await presignRes.json();

      setUploadId(muxUploadId);

      // Upload to Mux using XHR for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Upload failed"));

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      setStatus("processing");
      setProgress(100);

      // Notify parent with upload ID (asset ID will come via webhook)
      onUpload({ uploadId: muxUploadId });
      setStatus("done");
    } catch (err) {
      console.error("Video upload error:", err);
      setStatus("error");
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />

      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-pink-500/50 hover:bg-secondary transition-all"
          >
            <Video className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">Click to upload video</p>
            <p className="text-xs text-muted-foreground mt-1">
              MP4, MOV, AVI up to 5GB · Powered by Mux
            </p>
          </motion.div>
        )}

        {(status === "uploading" || status === "processing") && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-border rounded-xl p-6 bg-card"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Video className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{filename}</p>
                <p className="text-xs text-muted-foreground">
                  {status === "uploading" ? `Uploading... ${progress}%` : "Processing video..."}
                </p>
              </div>
              <Loader2 className="w-5 h-5 text-pink-500 animate-spin shrink-0" />
            </div>

            {status === "uploading" && (
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full gradient-bg rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
            )}

            {status === "processing" && (
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full gradient-bg rounded-full w-full animate-pulse" />
              </div>
            )}
          </motion.div>
        )}

        {status === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-green-500/30 bg-green-500/5 rounded-xl p-4 flex items-center gap-3"
          >
            <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-500">Upload complete!</p>
              <p className="text-xs text-muted-foreground">
                Video is processing and will be available shortly
              </p>
            </div>
            <button
              onClick={() => {
                setStatus("idle");
                setFilename("");
                setProgress(0);
              }}
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-destructive/30 bg-destructive/5 rounded-xl p-4"
          >
            <p className="text-sm text-destructive font-medium mb-2">Upload failed</p>
            <button
              onClick={() => {
                setStatus("idle");
                setProgress(0);
              }}
              className="text-xs gradient-bg text-white px-3 py-1.5 rounded-lg hover:opacity-90"
            >
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
