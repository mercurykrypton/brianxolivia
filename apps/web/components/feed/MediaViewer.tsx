"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaViewerProps {
  media: Array<{
    id: string;
    mediaType: string;
    url?: string;
    thumbnailUrl?: string;
    blurHash?: string | null;
    width?: number | null;
    height?: number | null;
    duration?: number | null;
    muxPlaybackId?: string | null;
  }>;
}

export function MediaViewer({ media }: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = media[currentIndex];

  if (!current) return null;

  const isVideo = current.mediaType === "VIDEO";

  return (
    <div className="relative bg-black">
      {/* Main media */}
      {isVideo ? (
        <VideoPlayer
          url={current.url}
          muxPlaybackId={current.muxPlaybackId}
          thumbnailUrl={current.thumbnailUrl}
        />
      ) : (
        <div className="max-h-[600px] overflow-hidden flex items-center justify-center">
          {current.url ? (
            <img
              src={current.url}
              alt=""
              className="w-full object-contain max-h-[600px]"
              loading="lazy"
            />
          ) : (
            <div className="aspect-square w-full bg-secondary animate-pulse" />
          )}
        </div>
      )}

      {/* Navigation (for multiple media) */}
      {media.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button
              onClick={() => setCurrentIndex(currentIndex - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {currentIndex < media.length - 1 && (
            <button
              onClick={() => setCurrentIndex(currentIndex + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
            {media.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  i === currentIndex ? "bg-white w-4" : "bg-white/50"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function VideoPlayer({
  url,
  muxPlaybackId,
  thumbnailUrl,
}: {
  url?: string;
  muxPlaybackId?: string | null;
  thumbnailUrl?: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (muxPlaybackId) {
    // Dynamically import MuxPlayer to avoid SSR issues
    const MuxPlayerComponent = () => {
      try {
        const MuxPlayer = require("@mux/mux-player-react").default;
        return (
          <div className="aspect-video w-full">
            <MuxPlayer
              playbackId={muxPlaybackId}
              streamType="on-demand"
              className="w-full h-full"
              accentColor="#FF1493"
              tokens={{ playback: url?.split("token=")[1] }}
            />
          </div>
        );
      } catch {
        return (
          <div className="aspect-video w-full bg-secondary flex items-center justify-center">
            <Play className="w-12 h-12 text-muted-foreground" />
          </div>
        );
      }
    };
    return <MuxPlayerComponent />;
  }

  if (!isPlaying) {
    return (
      <div
        className="relative aspect-video w-full cursor-pointer"
        onClick={() => setIsPlaying(true)}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-secondary" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center">
            <Play className="w-8 h-8 text-white" fill="currentColor" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <video
      src={url}
      controls
      autoPlay
      className="w-full aspect-video"
    />
  );
}
