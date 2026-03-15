"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle, XCircle, Clock, Package } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

const statusConfig = {
  PENDING: { label: "Pending", color: "text-yellow-500", bg: "bg-yellow-500/10", icon: Clock },
  ACCEPTED: { label: "Accepted", color: "text-blue-500", bg: "bg-blue-500/10", icon: CheckCircle },
  IN_PROGRESS: { label: "In Progress", color: "text-purple-500", bg: "bg-purple-500/10", icon: Clock },
  DELIVERED: { label: "Delivered", color: "text-green-500", bg: "bg-green-500/10", icon: CheckCircle },
  REJECTED: { label: "Rejected", color: "text-red-500", bg: "bg-red-500/10", icon: XCircle },
  CANCELED: { label: "Canceled", color: "text-muted-foreground", bg: "bg-secondary", icon: XCircle },
};

export default function RequestsPage() {
  const [filter, setFilter] = useState<string>("PENDING");
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.requests.getCreatorRequests.useInfiniteQuery(
    { limit: 20, status: filter as any },
    { getNextPageParam: (p) => p.nextCursor, initialCursor: undefined }
  );

  const updateStatus = trpc.requests.updateStatus.useMutation({
    onSuccess: () => {
      utils.requests.getCreatorRequests.invalidate();
      toast({ title: "Request updated" });
    },
  });

  const requests = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-20 md:pb-6">
      <h1 className="text-2xl font-bold mb-6">Content Requests</h1>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {Object.entries(statusConfig).map(([status, config]) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === status
                ? "gradient-bg text-white"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {config.label}
          </button>
        ))}
        <button
          onClick={() => setFilter("")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            !filter
              ? "gradient-bg text-white"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 shimmer rounded-2xl" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No {filter.toLowerCase()} requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req, i) => {
            const config = statusConfig[req.status as keyof typeof statusConfig];
            const Icon = config.icon;

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card border border-border rounded-2xl p-5"
              >
                <div className="flex items-start gap-4">
                  {req.requesterAvatarUrl ? (
                    <img
                      src={req.requesterAvatarUrl}
                      alt={req.requesterName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold shrink-0">
                      {req.requesterName[0]?.toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold">{req.title}</p>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1",
                          config.bg,
                          config.color
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      by {req.requesterName} · {formatRelativeTime(req.createdAt)}
                    </p>

                    <p className="text-sm mb-3 line-clamp-2">{req.description}</p>

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-pink-500">
                        {formatCurrency(req.budget)}
                      </span>

                      {req.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              updateStatus.mutate({
                                id: req.id,
                                status: "REJECTED",
                              })
                            }
                            disabled={updateStatus.isPending}
                            className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() =>
                              updateStatus.mutate({
                                id: req.id,
                                status: "ACCEPTED",
                              })
                            }
                            disabled={updateStatus.isPending}
                            className="px-3 py-1.5 gradient-bg text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                          >
                            Accept
                          </button>
                        </div>
                      )}

                      {req.status === "ACCEPTED" && (
                        <button
                          onClick={() =>
                            updateStatus.mutate({
                              id: req.id,
                              status: "IN_PROGRESS",
                            })
                          }
                          disabled={updateStatus.isPending}
                          className="px-3 py-1.5 gradient-bg text-white rounded-lg text-sm font-medium hover:opacity-90"
                        >
                          Start Work
                        </button>
                      )}

                      {req.status === "IN_PROGRESS" && (
                        <button
                          onClick={() =>
                            updateStatus.mutate({
                              id: req.id,
                              status: "DELIVERED",
                            })
                          }
                          disabled={updateStatus.isPending}
                          className="px-3 py-1.5 gradient-bg text-white rounded-lg text-sm font-medium hover:opacity-90"
                        >
                          Mark Delivered
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
