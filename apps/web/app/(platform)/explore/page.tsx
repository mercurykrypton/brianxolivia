"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, X, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { CreatorCard } from "@/components/creator/CreatorCard";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { useRef } from "react";
import { useIntersection } from "@/hooks/useIntersection";

type SortBy = "popular" | "new" | "trending";

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("popular");
  const debouncedQuery = useDebounce(query, 300);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data: tagsData } = trpc.creator.getPopularTags.useQuery();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = trpc.creator.search.useInfiniteQuery(
    {
      query: debouncedQuery || undefined,
      tags: selectedTag ? [selectedTag] : undefined,
      sortBy,
      limit: 12,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialCursor: undefined,
    }
  );

  useIntersection(loadMoreRef, () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  });

  const creators = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Explore Creators</h1>
        <p className="text-muted-foreground">
          Discover exclusive content from your favorite creators
        </p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4 mb-8">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search creators..."
            className="pl-9 bg-card border-border"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex gap-2">
          {(["popular", "new", "trending"] as SortBy[]).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${
                sortBy === s
                  ? "gradient-bg text-white"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Tags */}
        {tagsData && tagsData.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {tagsData.slice(0, 15).map(({ tag }) => (
              <button
                key={tag}
                onClick={() =>
                  setSelectedTag(selectedTag === tag ? null : tag)
                }
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedTag === tag
                    ? "gradient-bg text-white"
                    : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Creators grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="aspect-video shimmer" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 shimmer rounded" />
                <div className="h-3 w-1/2 shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : creators.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No creators found.</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {creators.map((creator, i) => (
            <motion.div
              key={creator.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.4) }}
            >
              <CreatorCard creator={creator} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Load more */}
      <div ref={loadMoreRef} className="py-8 flex justify-center">
        {isFetchingNextPage && (
          <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
        )}
      </div>
    </div>
  );
}
