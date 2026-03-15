"use client";

import { motion } from "framer-motion";
import { MessageCircle, Lock, Search } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { formatRelativeTime } from "@/lib/utils";
import { ConversationList } from "@/components/messaging/ConversationList";

export default function MessagesPage() {
  const { data: conversations, isLoading } =
    trpc.messages.getConversations.useQuery();

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        <div className="h-8 w-48 shimmer rounded mb-4" />
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl"
          >
            <div className="w-12 h-12 rounded-full shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 shimmer rounded" />
              <div className="h-3 w-48 shimmer rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>

      {!conversations || conversations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20"
        >
          <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No messages yet</h2>
          <p className="text-muted-foreground mb-6">
            Subscribe to a creator with DM access to start chatting
          </p>
          <Link
            href="/explore"
            className="gradient-bg text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Explore Creators
          </Link>
        </motion.div>
      ) : (
        <ConversationList conversations={conversations} />
      )}
    </div>
  );
}
