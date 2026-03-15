"use client";

import { useState, useRef } from "react";
import { Send, Image as ImageIcon, DollarSign, Lock, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface MessageComposerProps {
  conversationId: string;
  onSend: (data: {
    body?: string;
    mediaKey?: string;
    isPPV?: boolean;
    ppvPrice?: number;
    tipAmount?: number;
  }) => void;
  isSending?: boolean;
}

export function MessageComposer({
  conversationId,
  onSend,
  isSending,
}: MessageComposerProps) {
  const [body, setBody] = useState("");
  const [isPPV, setIsPPV] = useState(false);
  const [ppvPrice, setPPVPrice] = useState<string>("5");
  const [showPPV, setShowPPV] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!body.trim() && !isPPV) return;
    onSend({
      body: body.trim() || undefined,
      isPPV,
      ppvPrice: isPPV ? parseFloat(ppvPrice) : undefined,
    });
    setBody("");
    setIsPPV(false);
    setShowPPV(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-2">
      {/* PPV toggle */}
      <AnimatePresence>
        {showPPV && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 p-2 bg-secondary rounded-xl"
          >
            <Lock className="w-4 h-4 text-pink-500" />
            <span className="text-sm font-medium">PPV Price:</span>
            <div className="relative flex-1">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="number"
                value={ppvPrice}
                onChange={(e) => setPPVPrice(e.target.value)}
                min="0.99"
                step="1"
                className="w-full pl-6 pr-2 py-1 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>
            <button
              onClick={() => {
                setIsPPV(!isPPV);
              }}
              className={cn(
                "text-xs px-2 py-1 rounded-lg font-medium transition-all",
                isPPV
                  ? "gradient-bg text-white"
                  : "bg-card border border-border text-muted-foreground"
              )}
            >
              {isPPV ? "PPV ON" : "PPV OFF"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main composer */}
      <div className="flex items-end gap-2">
        {/* Attachment buttons */}
        <div className="flex gap-1 pb-1">
          <button
            type="button"
            onClick={() => setShowPPV(!showPPV)}
            className={cn(
              "p-2 rounded-xl transition-colors",
              showPPV
                ? "text-pink-500 bg-pink-500/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
            title="Pay Per View message"
          >
            <Lock className="w-5 h-5" />
          </button>
        </div>

        {/* Text input */}
        <div className="flex-1 bg-secondary rounded-2xl px-4 py-2.5 flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none max-h-32 overflow-y-auto"
            style={{ height: "auto" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 128) + "px";
            }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={(!body.trim() && !isPPV) || isSending}
          className="p-2.5 gradient-bg text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shrink-0"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {isPPV && (
        <p className="text-xs text-pink-500 text-center">
          This message will cost ${ppvPrice} for the recipient to unlock
        </p>
      )}
    </div>
  );
}
