"use client";

import { motion } from "framer-motion";
import { EarningsChart } from "@/components/dashboard/EarningsChart";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { trpc } from "@/lib/trpc/provider";
import { formatCurrency, formatCompactNumber } from "@/lib/utils";
import { DollarSign, Users, TrendingUp, Eye } from "lucide-react";

export default function AnalyticsPage() {
  const { data: stats } = trpc.creator.getDashboardStats.useQuery();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Earnings"
          value={formatCurrency(stats?.totalEarnings ?? 0)}
          icon={DollarSign}
          gradient="from-pink-500 to-pink-700"
        />
        <StatsCard
          title="This Month"
          value={formatCurrency(stats?.monthlyEarnings ?? 0)}
          icon={TrendingUp}
          gradient="from-purple-500 to-purple-700"
          change={stats?.earningsGrowth}
        />
        <StatsCard
          title="Subscribers"
          value={formatCompactNumber(stats?.subscriberCount ?? 0)}
          icon={Users}
          gradient="from-pink-600 to-purple-600"
        />
        <StatsCard
          title="New This Month"
          value={String(stats?.newSubscribersThisMonth ?? 0)}
          icon={Users}
          gradient="from-purple-600 to-pink-500"
        />
      </div>

      {/* Earnings chart - multiple periods */}
      <EarningsChart showPeriodSelector />

      {/* Tips breakdown */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold mb-4">Recent Tips</h3>
        <TipsBreakdown />
      </div>
    </div>
  );
}

function TipsBreakdown() {
  const { data, isLoading } = trpc.tips.getReceived.useInfiniteQuery(
    { limit: 10 },
    { getNextPageParam: (p) => p.nextCursor, initialCursor: undefined }
  );

  const tips = data?.pages.flatMap((p) => p.items) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 shimmer rounded" />
        ))}
      </div>
    );
  }

  if (tips.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-4">No tips yet</p>
    );
  }

  return (
    <div className="space-y-3">
      {tips.map((tip) => (
        <div key={tip.id} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tip.sender.avatarUrl ? (
              <img
                src={tip.sender.avatarUrl}
                alt={tip.sender.displayName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-xs">
                {tip.sender.displayName[0]}
              </div>
            )}
            <div>
              <p className="text-sm font-medium">{tip.sender.displayName}</p>
              {tip.message && (
                <p className="text-xs text-muted-foreground truncate max-w-48">
                  "{tip.message}"
                </p>
              )}
            </div>
          </div>
          <span className="font-semibold text-pink-500">
            +{formatCurrency(tip.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
