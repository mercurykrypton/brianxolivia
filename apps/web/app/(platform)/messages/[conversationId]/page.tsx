"use client";

import { use, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { MessageBubble } from "@/components/messaging/MessageBubble";
import { MessageComposer } from "@/components/messaging/MessageComposer";
import { getPublicUrl } from "@/lib/r2";

interface Props {
  params: Promise<{ conversationId: string }>;
}

export default function ConversationPage({ params }: Props) {
  const { conversationId } = use(params);
  const bottomRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: messagesData, isLoading } = trpc.messages.getMessages.useQuery(
    { conversationId, limit: 50 },
    { enabled: !!conversationId }
  );

  const { data: conversations } = trpc.messages.getConversations.useQuery();
  const conversation = conversations?.find((c) => c.id === conversationId);

  const sendMessage = trpc.messages.sendMessage.useMutation({
    onSuccess: () => {
      utils.messages.getMessages.invalidate({ conversationId });
      utils.messages.getConversations.invalidate();
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData?.items.length]);

  const messages = messagesData?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  const otherParty = conversation?.otherParty;
  const isLocked = conversation && !conversation.isUnlocked;

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <Link
          href="/messages"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {otherParty && (
          <div className="flex items-center gap-3 flex-1">
            {otherParty.avatarUrl ? (
              <img
                src={otherParty.avatarUrl}
                alt={otherParty.displayName}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-sm">
                {otherParty.displayName[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-sm flex items-center gap-1.5">
                {otherParty.displayName}
                {otherParty.type === "creator" &&
                  (otherParty as { isVerified?: boolean }).isVerified && (
                    <span className="text-pink-500 text-xs">✓</span>
                  )}
              </p>
              {"slug" in otherParty && (
                <Link
                  href={`/c/${(otherParty as { slug: string }).slug}`}
                  className="text-xs text-muted-foreground hover:text-pink-500 transition-colors"
                >
                  @{(otherParty as { slug: string }).slug}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !isLocked && (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">
              Say hello to {otherParty?.displayName}!
            </p>
          </div>
        )}

        {isLocked && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">DMs Locked</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-xs">
              {conversation?.dmPrice
                ? `Pay $${conversation.dmPrice} to unlock direct messaging`
                : "Subscribe with DM access to send messages"}
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <MessageBubble message={message} isOwn={message.isOwnMessage} />
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {!isLocked && (
        <div className="border-t border-border bg-background p-4">
          <MessageComposer
            conversationId={conversationId}
            onSend={(data) =>
              sendMessage.mutate({ conversationId, ...data })
            }
            isSending={sendMessage.isPending}
          />
        </div>
      )}
    </div>
  );
}
