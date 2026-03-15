"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Eye, EyeOff, Pin, MoreVertical, Loader2 } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

export default function PostsPage() {
  const [filter, setFilter] = useState<"all" | "published" | "drafts">("all");
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data, isLoading, fetchNextPage, hasNextPage } =
    trpc.posts.getMyPosts.useInfiniteQuery(
      {
        limit: 20,
        isPublished: filter === "all" ? undefined : filter === "published",
      },
      { getNextPageParam: (p) => p.nextCursor, initialCursor: undefined }
    );

  const deletePost = trpc.posts.delete.useMutation({
    onSuccess: () => {
      utils.posts.getMyPosts.invalidate();
      toast({ title: "Post deleted" });
    },
  });

  const togglePin = trpc.posts.togglePin.useMutation({
    onSuccess: () => utils.posts.getMyPosts.invalidate(),
  });

  const posts = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Posts</h1>
        <Link
          href="/posts/new"
          className="gradient-bg text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Post
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "published", "drafts"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${
              filter === f
                ? "gradient-bg text-white"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 shimmer rounded-2xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <p className="text-muted-foreground mb-4">No posts yet</p>
          <Link
            href="/posts/new"
            className="gradient-bg text-white px-6 py-3 rounded-xl font-medium hover:opacity-90"
          >
            Create Your First Post
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4 group"
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary shrink-0">
                {post.media[0]?.thumbnailUrl ? (
                  <img
                    src={post.media[0].thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl">
                    {post.contentType === "VIDEO" ? "🎬" : post.contentType === "TEXT" ? "📝" : "📸"}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {post.title ?? post.body?.slice(0, 50) ?? "Untitled post"}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {post.isPublished ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    {post.isPublished ? "Published" : "Draft"}
                  </span>
                  <span>❤️ {post.likes}</span>
                  <span>💬 {post.comments}</span>
                  {post.isPaid && <span className="text-pink-500">💰 PPV</span>}
                  {post.isPinned && <Pin className="w-3.5 h-3.5 text-pink-500" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {post.publishedAt
                    ? formatRelativeTime(post.publishedAt)
                    : formatRelativeTime(post.createdAt)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => togglePin.mutate({ postId: post.id })}
                  className={`p-1.5 rounded-lg transition-colors ${
                    post.isPinned
                      ? "text-pink-500"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={post.isPinned ? "Unpin" : "Pin"}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this post?")) {
                      deletePost.mutate({ id: post.id });
                    }
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  );
}
