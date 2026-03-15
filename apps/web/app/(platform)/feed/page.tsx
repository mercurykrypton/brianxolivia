"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { PostCard } from "@/components/feed/PostCard";
import { useIntersection } from "@/hooks/useIntersection";
import { useRef } from "react";

export default function FeedPage() {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    trpc.posts.getFeed.useInfiniteQuery(
      { limit: 10 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialCursor: undefined,
      }
    );

  useIntersection(loadMoreRef, () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  });

  const posts = data?.pages.flatMap((p) => p.items) ?? [];

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 shimmer rounded" />
                <div className="h-3 w-24 shimmer rounded" />
              </div>
            </div>
            <div className="aspect-square shimmer" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-full shimmer rounded" />
              <div className="h-4 w-3/4 shimmer rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">✨</div>
          <h2 className="text-2xl font-bold mb-2">Your feed is empty</h2>
          <p className="text-muted-foreground mb-6">
            Subscribe to creators to see their exclusive content here.
          </p>
          <a
            href="/explore"
            className="gradient-bg text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Explore Creators
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6">
      <div className="space-y-4">
        {posts.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.3) }}
          >
            <PostCard post={post} />
          </motion.div>
        ))}
      </div>

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="py-4 flex justify-center">
        {isFetchingNextPage && (
          <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
        )}
        {!hasNextPage && posts.length > 0 && (
          <p className="text-muted-foreground text-sm">You're all caught up!</p>
        )}
      </div>
    </div>
  );
}
