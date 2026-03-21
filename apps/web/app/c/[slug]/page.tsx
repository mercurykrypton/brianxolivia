"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import {
  Verified,
  Globe,
  Twitter,
  Instagram,
  Lock,
  Users,
  FileText,
  Heart,
  DollarSign,
  Bot,
} from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { PostCard } from "@/components/feed/PostCard";
import { TierCard } from "@/components/creator/TierCard";
import { TipModal } from "@/components/payment/TipModal";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

type Tab = "posts" | "videos" | "photos";

export default function CreatorProfilePage({ params }: Props) {
  const { slug } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [showTipModal, setShowTipModal] = useState(false);

  const { data: creator, isLoading } = trpc.creator.getBySlug.useQuery({ slug });

  const { data: postsData } = trpc.posts.getCreatorPosts.useInfiniteQuery(
    {
      creatorProfileId: creator?.id ?? "",
      limit: 12,
      contentType:
        activeTab === "videos"
          ? "VIDEO"
          : activeTab === "photos"
          ? "PHOTO"
          : undefined,
    },
    {
      enabled: !!creator?.id,
      getNextPageParam: (p) => p.nextCursor,
      initialCursor: undefined,
    }
  );

  const posts = postsData?.pages.flatMap((p) => p.items) ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Banner skeleton */}
        <div className="h-48 md:h-64 shimmer" />
        <div className="max-w-4xl mx-auto px-4 -mt-16">
          <div className="w-32 h-32 rounded-full shimmer border-4 border-background" />
          <div className="mt-4 space-y-2">
            <div className="h-7 w-48 shimmer rounded" />
            <div className="h-4 w-64 shimmer rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">404</p>
          <p className="text-muted-foreground">Creator not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-pink-500/20 to-purple-500/20 relative overflow-hidden">
        {creator.bannerUrl ? (
          <img
            src={creator.bannerUrl}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-500/30 to-purple-500/30" />
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Profile header */}
        <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-16 pb-4 border-b border-border">
          {/* Avatar */}
          <div className="relative shrink-0">
            {creator.avatarUrl ? (
              <img
                src={creator.avatarUrl}
                alt={creator.displayName}
                className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-background shadow-xl"
              />
            ) : (
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full gradient-bg border-4 border-background shadow-xl flex items-center justify-center text-white font-bold text-4xl">
                {creator.displayName[0]?.toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 md:pb-2">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {creator.displayName}
                  {creator.isVerified && (
                    <Verified className="w-5 h-5 text-pink-500" fill="currentColor" />
                  )}
                  {creator.isAgent && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                      <Bot className="w-3 h-3" />
                      AI
                    </span>
                  )}
                </h1>
                <p className="text-muted-foreground">@{creator.slug}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowTipModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-secondary rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                >
                  <DollarSign className="w-4 h-4" />
                  Tip
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <strong className="text-foreground">{creator.subscriberCount}</strong>
                {" "}subscribers
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <strong className="text-foreground">{creator.postCount}</strong>
                {" "}posts
              </span>
            </div>

            {/* Bio */}
            {creator.bio && (
              <p className="mt-3 text-sm max-w-lg">{creator.bio}</p>
            )}

            {/* Tags */}
            {creator.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mt-2">
                {creator.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-500"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Social links */}
            <div className="flex gap-3 mt-3">
              {creator.websiteUrl && (
                <a
                  href={creator.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Globe className="w-4 h-4" />
                </a>
              )}
              {creator.twitterHandle && (
                <a
                  href={`https://twitter.com/${creator.twitterHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {creator.instagramHandle && (
                <a
                  href={`https://instagram.com/${creator.instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 py-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Subscription tiers (if not subscribed) */}
            {!creator.isSubscribed && creator.subscriptionTiers.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-pink-500" />
                  Subscribe for Exclusive Content
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {creator.subscriptionTiers.map((tier) => (
                    <TierCard
                      key={tier.id}
                      tier={tier}
                      creatorProfileId={creator.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-secondary p-1 rounded-xl mb-4">
              {(["posts", "photos", "videos"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-sm font-medium capitalize transition-all",
                    activeTab === tab
                      ? "gradient-bg text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Posts grid */}
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No content yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <PostCard
                      post={{
                        ...post,
                        creatorProfile: {
                          id: creator.id,
                          displayName: creator.displayName,
                          slug: creator.slug,
                          avatarUrl: creator.avatarUrl,
                          isVerified: creator.isVerified,
                        },
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar - subscription tiers (if subscribed, show just the current plan) */}
          <div className="md:w-72 shrink-0">
            {creator.isSubscribed && creator.activeSubscription && (
              <div className="bg-card border border-pink-500/30 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 text-pink-500 mb-2">
                  <Heart className="w-4 h-4" fill="currentColor" />
                  <span className="text-sm font-semibold">Subscribed</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {creator.activeSubscription.tier.name} tier
                </p>
              </div>
            )}

            {!creator.isSubscribed && creator.subscriptionTiers.length > 0 && (
              <div className="hidden md:block">
                {/* Shown in main content on mobile, sidebar on desktop */}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tip modal */}
      {showTipModal && (
        <TipModal
          creatorProfileId={creator.id}
          creatorName={creator.displayName}
          onClose={() => setShowTipModal(false)}
        />
      )}
    </div>
  );
}
