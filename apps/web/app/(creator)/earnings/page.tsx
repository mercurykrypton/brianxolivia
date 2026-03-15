"use client";

import { motion } from "framer-motion";
import { DollarSign, ExternalLink, Loader2, ArrowUpRight } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

export default function EarningsPage() {
  const { toast } = useToast();
  const { data: balance } = trpc.payments.getBalance.useQuery();
  const { data: connectStatus } = trpc.payments.getConnectStatus.useQuery();
  const { data: payouts } = trpc.payments.getPayouts.useInfiniteQuery(
    { limit: 20 },
    { getNextPageParam: (p) => p.nextCursor, initialCursor: undefined }
  );

  const connectOnboarding = trpc.creator.getConnectOnboardingUrl.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
    },
  });

  const payoutItems = payouts?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6">
      <h1 className="text-2xl font-bold">Earnings & Payouts</h1>

      {/* Stripe Connect status */}
      {!connectStatus?.connected ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-border rounded-2xl p-6 bg-card"
        >
          <h2 className="text-lg font-semibold mb-2">Connect Stripe to Get Paid</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Set up your Stripe Express account to receive weekly payouts directly
            to your bank account.
          </p>
          <button
            onClick={() => connectOnboarding.mutate()}
            disabled={connectOnboarding.isPending}
            className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            {connectOnboarding.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Set Up Stripe Payouts
          </button>
        </motion.div>
      ) : (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-500">
              Stripe connected • Payouts active
            </span>
          </div>
          <button
            onClick={() => connectOnboarding.mutate()}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            Manage
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="gradient-border rounded-2xl p-6 bg-card">
          <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
          <p className="text-4xl font-bold gradient-text">
            {formatCurrency(balance?.available ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Paid out automatically every Friday
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-sm text-muted-foreground mb-1">Pending</p>
          <p className="text-4xl font-bold text-muted-foreground">
            {formatCurrency(balance?.pending ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Processing, usually 2-7 business days
          </p>
        </div>
      </div>

      {/* Payout history */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Payout History</h2>
        {payoutItems.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No payouts yet. Your first payout will arrive after the weekly cycle.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {payoutItems.map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between bg-card border border-border rounded-xl p-4"
              >
                <div>
                  <p className="font-medium">{formatCurrency(payout.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {payout.arrivalDate
                      ? `Arrived ${formatDate(payout.arrivalDate)}`
                      : "Processing..."}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    payout.status === "PAID"
                      ? "bg-green-500/10 text-green-500"
                      : payout.status === "FAILED"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-yellow-500/10 text-yellow-500"
                  )}
                >
                  {payout.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
