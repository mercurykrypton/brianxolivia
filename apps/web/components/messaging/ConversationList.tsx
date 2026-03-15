"use client";

import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { Verified, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  otherParty: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    type: "creator" | "fan";
    slug?: string;
    isVerified?: boolean;
  };
  lastMessage?: {
    id: string;
    body?: string | null;
    isPPV: boolean;
    createdAt: Date;
    isRead: boolean;
    senderId: string;
  } | null;
  unreadCount: number;
  isUnlocked: boolean;
  dmPrice?: number | null;
  lastMessageAt?: Date | null;
}

interface ConversationListProps {
  conversations: Conversation[];
}

export function ConversationList({ conversations }: ConversationListProps) {
  return (
    <div className="space-y-2">
      {conversations.map((conv) => (
        <Link
          key={conv.id}
          href={`/messages/${conv.id}`}
          className={cn(
            "flex items-center gap-3 p-3 rounded-2xl border transition-all hover:border-pink-500/30 group",
            conv.unreadCount > 0
              ? "bg-pink-500/5 border-pink-500/20"
              : "bg-card border-border"
          )}
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            {conv.otherParty.avatarUrl ? (
              <img
                src={conv.otherParty.avatarUrl}
                alt={conv.otherParty.displayName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center text-white font-bold">
                {conv.otherParty.displayName[0]?.toUpperCase()}
              </div>
            )}
            {!conv.isUnlocked && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-background flex items-center justify-center">
                <Lock className="w-3 h-3 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm truncate">
                {conv.otherParty.displayName}
              </p>
              {conv.otherParty.isVerified && (
                <Verified className="w-3.5 h-3.5 text-pink-500 shrink-0" />
              )}
            </div>

            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {conv.lastMessage
                ? conv.lastMessage.isPPV
                  ? "PPV message"
                  : conv.lastMessage.body ?? "Media"
                : "No messages yet"}
            </p>
          </div>

          {/* Meta */}
          <div className="shrink-0 text-right">
            {conv.lastMessageAt && (
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(conv.lastMessageAt)}
              </p>
            )}
            {conv.unreadCount > 0 && (
              <div className="mt-1 ml-auto w-5 h-5 rounded-full gradient-bg flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                </span>
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
