"use client";

import { motion } from "framer-motion";
import { Bell, Check, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const notificationIcons: Record<string, string> = {
  NEW_SUBSCRIBER: "🎉",
  NEW_TIP: "💸",
  NEW_MESSAGE: "💬",
  NEW_COMMENT: "💬",
  NEW_LIKE: "❤️",
  POST_PUBLISHED: "📸",
  CONTENT_REQUEST: "✨",
  PAYOUT_SENT: "💰",
  SUBSCRIPTION_RENEWED: "🔄",
  SUBSCRIPTION_CANCELED: "❌",
  VERIFICATION_APPROVED: "✅",
  SYSTEM: "📢",
};

export default function NotificationsPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.notifications.getAll.useQuery({ limit: 50 });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.getAll.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const deleteNotification = trpc.notifications.delete.useMutation({
    onSuccess: () => utils.notifications.getAll.invalidate(),
  });

  const notifications = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        <div className="h-8 w-40 shimmer rounded mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 p-4 bg-card border border-border rounded-2xl">
            <div className="w-10 h-10 rounded-full shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 shimmer rounded" />
              <div className="h-3 w-64 shimmer rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={() => markRead.mutate({ ids: [] })}
            className="flex items-center gap-1.5 text-sm text-pink-500 hover:text-pink-400 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No notifications</h2>
          <p className="text-muted-foreground">
            You're all caught up! Check back later.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification, i) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.2) }}
              className={cn(
                "flex items-start gap-3 p-4 rounded-2xl border transition-colors group",
                notification.isRead
                  ? "bg-card border-border"
                  : "bg-pink-500/5 border-pink-500/20"
              )}
            >
              {/* Icon */}
              <div className="text-2xl shrink-0 mt-0.5">
                {notificationIcons[notification.type] ?? "📢"}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    !notification.isRead && "text-white"
                  )}
                >
                  {notification.title}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {notification.body}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {formatRelativeTime(notification.createdAt)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!notification.isRead && (
                  <button
                    onClick={() =>
                      markRead.mutate({ ids: [notification.id] })
                    }
                    className="p-1 text-muted-foreground hover:text-pink-500 transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() =>
                    deleteNotification.mutate({ id: notification.id })
                  }
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
