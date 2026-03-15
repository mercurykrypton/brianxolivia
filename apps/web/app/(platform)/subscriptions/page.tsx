"use client";

import { motion } from "framer-motion";
import { Heart, Crown, Calendar, DollarSign } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { formatDate, formatCurrency } from "@/lib/utils";
import { getPublicUrl } from "@/lib/r2";
import { cn } from "@/lib/utils";

export default function SubscriptionsPage() {
  const { data: subscriptions, isLoading } =
    trpc.subscriptions.getMySubscriptions.useQuery();

  const cancelMutation = trpc.subscriptions.cancel.useMutation();
  const utils = trpc.useUtils();

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="h-8 w-48 shimmer rounded mb-4" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 flex gap-4">
            <div className="w-16 h-16 rounded-full shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-40 shimmer rounded" />
              <div className="h-4 w-24 shimmer rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-20 md:pb-6">
      <h1 className="text-2xl font-bold mb-6">My Subscriptions</h1>

      {!subscriptions || subscriptions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20"
        >
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No active subscriptions</h2>
          <p className="text-muted-foreground mb-6">
            Subscribe to creators to access their exclusive content
          </p>
          <Link
            href="/explore"
            className="gradient-bg text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Explore Creators
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-4 flex gap-4 items-start"
            >
              {/* Creator avatar */}
              <Link href={`/c/${sub.tier.creatorProfile.slug}`}>
                {sub.tier.creatorProfile.avatarKey ? (
                  <img
                    src={getPublicUrl(sub.tier.creatorProfile.avatarKey)}
                    alt={sub.tier.creatorProfile.displayName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-xl">
                    {sub.tier.creatorProfile.displayName[0]?.toUpperCase()}
                  </div>
                )}
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/c/${sub.tier.creatorProfile.slug}`}
                  className="font-semibold hover:text-pink-500 transition-colors"
                >
                  {sub.tier.creatorProfile.displayName}
                </Link>

                <div className="flex items-center gap-2 mt-1">
                  <Crown className="w-4 h-4 text-pink-500" />
                  <span className="text-sm text-muted-foreground">
                    {sub.tier.name}
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(sub.tier.price)}/mo
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Renews {sub.currentPeriodEnd
                      ? formatDate(sub.currentPeriodEnd)
                      : "N/A"}
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      sub.status === "ACTIVE"
                        ? "bg-green-500/10 text-green-500"
                        : sub.status === "PAST_DUE"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-red-500/10 text-red-500"
                    )}
                  >
                    {sub.status}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Link
                  href={`/c/${sub.tier.creatorProfile.slug}`}
                  className="text-sm text-pink-500 hover:text-pink-400 transition-colors"
                >
                  View
                </Link>
                {sub.status === "ACTIVE" && !sub.cancelAtPeriodEnd && (
                  <button
                    onClick={() =>
                      cancelMutation
                        .mutateAsync({ subscriptionId: sub.id })
                        .then(() => utils.subscriptions.getMySubscriptions.invalidate())
                    }
                    className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Cancel
                  </button>
                )}
                {sub.cancelAtPeriodEnd && (
                  <span className="text-xs text-yellow-500">
                    Cancels {formatDate(sub.currentPeriodEnd!)}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
