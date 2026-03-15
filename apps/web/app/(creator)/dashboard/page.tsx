"use client";

import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc/provider";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EarningsChart } from "@/components/dashboard/EarningsChart";
import { SubscriberTable } from "@/components/dashboard/SubscriberTable";
import { formatCurrency, formatCompactNumber } from "@/lib/utils";
import {
  DollarSign,
  Users,
  TrendingUp,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } =
    trpc.creator.getDashboardStats.useQuery();
  const { data: balance } = trpc.payments.getBalance.useQuery();
  const { data: connectStatus } = trpc.payments.getConnectStatus.useQuery();
  const connectOnboarding = trpc.creator.getConnectOnboardingUrl.useMutation();

  if (statsLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="h-8 w-48 shimmer rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 shimmer rounded-2xl" />
          ))}
        </div>
        <div className="h-64 shimmer rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Creator Dashboard</h1>
        <Link
          href="/posts/new"
          className="gradient-bg text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          New Post
        </Link>
      </div>

      {/* Stripe Connect banner */}
      {!connectStatus?.connected && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-border rounded-xl p-4 flex items-center justify-between"
        >
          <div>
            <p className="font-semibold">Set up payouts to start earning</p>
            <p className="text-sm text-muted-foreground">
              Connect your Stripe account to receive payments from fans
            </p>
          </div>
          <button
            onClick={() =>
              connectOnboarding.mutateAsync().then((data) => {
                window.open(data.url, "_blank");
              })
            }
            disabled={connectOnboarding.isPending}
            className="gradient-bg text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shrink-0 flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Connect Stripe
          </button>
        </motion.div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Earnings"
          value={formatCurrency(stats?.totalEarnings ?? 0)}
          icon={DollarSign}
          gradient="from-pink-500 to-pink-700"
          subtitle={`${formatCurrency(stats?.monthlyEarnings ?? 0)} this month`}
          change={stats?.earningsGrowth}
        />
        <StatsCard
          title="Subscribers"
          value={formatCompactNumber(stats?.subscriberCount ?? 0)}
          icon={Users}
          gradient="from-purple-500 to-purple-700"
          subtitle={`+${stats?.newSubscribersThisMonth ?? 0} this month`}
        />
        <StatsCard
          title="Total Posts"
          value={String(stats?.totalPosts ?? 0)}
          icon={FileText}
          gradient="from-pink-600 to-purple-600"
        />
        <StatsCard
          title="Available Balance"
          value={formatCurrency(balance?.available ?? 0)}
          icon={TrendingUp}
          gradient="from-purple-600 to-pink-500"
          subtitle={`$${balance?.pending?.toFixed(2) ?? "0"} pending`}
        />
      </div>

      {/* Earnings chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EarningsChart />
        </div>

        {/* Recent transactions */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Recent Transactions</h3>
          {stats?.recentTransactions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-3">
              {stats?.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium truncate max-w-[140px]">
                      {tx.description ?? tx.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-green-500">
                    +{formatCurrency(tx.netAmount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subscribers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Subscribers</h2>
          <Link
            href="/analytics"
            className="text-sm text-pink-500 hover:text-pink-400 transition-colors"
          >
            View all
          </Link>
        </div>
        <SubscriberTable />
      </div>
    </div>
  );
}
