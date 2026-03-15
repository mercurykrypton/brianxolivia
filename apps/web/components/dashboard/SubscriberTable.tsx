"use client";

import { formatDate, formatCurrency } from "@/lib/utils";
import { trpc } from "@/lib/trpc/provider";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export function SubscriberTable() {
  const { data, isLoading } = trpc.creator.getSubscribers.useInfiniteQuery(
    { limit: 10 },
    { getNextPageParam: (p) => p.nextCursor, initialCursor: undefined }
  );

  const subscribers = data?.pages.flatMap((p) => p.items) ?? [];

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full shimmer" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-36 shimmer rounded" />
                <div className="h-3 w-24 shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (subscribers.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <Crown className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">No subscribers yet</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Subscriber
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Tier
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Amount
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Status
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((sub) => (
              <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {sub.avatarUrl ? (
                      <img
                        src={sub.avatarUrl}
                        alt={sub.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
                        {sub.displayName[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium">{sub.displayName}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-pink-500" />
                    {sub.tierName}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium">
                    {formatCurrency(sub.tierPrice)}/mo
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      sub.status === "ACTIVE"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-yellow-500/10 text-yellow-500"
                    )}
                  >
                    {sub.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {formatDate(sub.startedAt)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
