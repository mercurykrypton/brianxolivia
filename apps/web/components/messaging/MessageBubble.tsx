"use client";

import { Lock, DollarSign } from "lucide-react";
import { formatRelativeTime, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: {
    id: string;
    senderId: string;
    isOwnMessage: boolean;
    body?: string | null;
    mediaKey?: string | null;
    isPPV: boolean;
    ppvPrice?: number | null;
    ppvUnlocked: boolean;
    isRead: boolean;
    tipAmount?: number | null;
    createdAt: Date;
    sender: {
      id: string;
      displayName: string;
      avatarUrl?: string | null;
    };
  };
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const isPPVLocked = message.isPPV && !message.ppvUnlocked && !isOwn;

  return (
    <div className={cn("flex items-end gap-2", isOwn && "flex-row-reverse")}>
      {/* Avatar */}
      {!isOwn && (
        <div className="shrink-0 mb-1">
          {message.sender.avatarUrl ? (
            <img
              src={message.sender.avatarUrl}
              alt={message.sender.displayName}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
              {message.sender.displayName[0]?.toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Bubble */}
      <div className={cn("max-w-[70%] space-y-1", isOwn && "items-end flex flex-col")}>
        {isPPVLocked ? (
          <div
            className={cn(
              "rounded-2xl p-4 border border-dashed",
              isOwn
                ? "border-pink-500/30 bg-pink-500/10"
                : "border-border bg-secondary"
            )}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span className="text-sm">PPV Message</span>
            </div>
            <p className="text-lg font-bold gradient-text mt-1">
              {formatCurrency(message.ppvPrice ?? 0)}
            </p>
            <button className="mt-2 gradient-bg text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Unlock
            </button>
          </div>
        ) : (
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5",
              isOwn
                ? "gradient-bg text-white rounded-br-sm"
                : "bg-secondary text-foreground rounded-bl-sm"
            )}
          >
            {message.body && (
              <p className="text-sm whitespace-pre-wrap">{message.body}</p>
            )}
            {message.tipAmount && (
              <div className="flex items-center gap-1.5 text-sm font-semibold text-yellow-300">
                <DollarSign className="w-4 h-4" />
                Tipped {formatCurrency(message.tipAmount)}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p
          className={cn(
            "text-xs text-muted-foreground px-1",
            isOwn && "text-right"
          )}
        >
          {formatRelativeTime(message.createdAt)}
          {isOwn && message.isRead && (
            <span className="ml-1 text-pink-500">✓✓</span>
          )}
        </p>
      </div>
    </div>
  );
}
