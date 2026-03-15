"use client";

import { useState } from "react";
import { Lock, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { CheckoutModal } from "@/components/payment/CheckoutModal";

interface PaywallOverlayProps {
  post: {
    id: string;
    isPaid: boolean;
    price?: number | null;
    requiredTierId?: string | null;
    creatorProfile: {
      id: string;
      displayName: string;
      slug: string;
    };
  };
  firstMedia: {
    mediaType: string;
    blurHash?: string | null;
    thumbnailUrl?: string;
    width?: number | null;
    height?: number | null;
  };
}

export function PaywallOverlay({ post, firstMedia }: PaywallOverlayProps) {
  const [showCheckout, setShowCheckout] = useState(false);

  const aspectRatio =
    firstMedia.height && firstMedia.width
      ? firstMedia.width / firstMedia.height
      : 1;

  return (
    <>
      <div className="relative overflow-hidden">
        {/* Blurred preview */}
        <div
          className="w-full"
          style={{ aspectRatio: Math.min(Math.max(aspectRatio, 0.5), 2) }}
        >
          {firstMedia.thumbnailUrl ? (
            <img
              src={firstMedia.thumbnailUrl}
              alt="Locked content"
              className="w-full h-full object-cover blur-xl scale-110"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: firstMedia.blurHash
                  ? "linear-gradient(135deg, #FF1493/20, #9B59B6/20)"
                  : "linear-gradient(135deg, rgba(255,20,147,0.2), rgba(155,89,182,0.2))",
              }}
            />
          )}
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            {post.isPaid ? (
              <>
                <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-500/30">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <p className="text-white font-bold text-lg mb-1">
                  Unlock for {formatCurrency(post.price ?? 0)}
                </p>
                <p className="text-white/70 text-sm mb-4">
                  One-time purchase
                </p>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="gradient-bg text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
                >
                  <DollarSign className="w-4 h-4" />
                  Unlock Post
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-500/30">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <p className="text-white font-bold text-lg mb-1">
                  Subscribers Only
                </p>
                <p className="text-white/70 text-sm mb-4">
                  Subscribe to {post.creatorProfile.displayName} to unlock
                </p>
                <a
                  href={`/c/${post.creatorProfile.slug}`}
                  className="gradient-bg text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2"
                >
                  Subscribe
                </a>
              </>
            )}
          </motion.div>
        </div>
      </div>

      {showCheckout && post.isPaid && (
        <CheckoutModal
          type="post"
          postId={post.id}
          amount={post.price ?? 0}
          description={`Unlock post from ${post.creatorProfile.displayName}`}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => setShowCheckout(false)}
        />
      )}
    </>
  );
}
