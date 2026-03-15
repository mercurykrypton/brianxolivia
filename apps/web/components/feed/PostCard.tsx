"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Lock,
  DollarSign,
  Verified,
  MoreHorizontal,
  Pin,
} from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { formatRelativeTime, formatCurrency } from "@/lib/utils";
import { MediaViewer } from "./MediaViewer";
import { PaywallOverlay } from "./PaywallOverlay";
import { cn } from "@/lib/utils";

interface PostCardProps {
  post: {
    id: string;
    title?: string | null;
    body?: string | null;
    contentType: string;
    isPaid: boolean;
    price?: number | null;
    isLocked: boolean;
    likeCount: number;
    commentCount: number;
    publishedAt?: Date | null;
    isPinned?: boolean;
    creatorProfile: {
      id: string;
      displayName: string;
      slug: string;
      avatarUrl?: string | null;
      isVerified: boolean;
    };
    media: Array<{
      id: string;
      mediaType: string;
      url?: string;
      thumbnailUrl?: string;
      blurHash?: string | null;
      width?: number | null;
      height?: number | null;
      duration?: number | null;
      muxPlaybackId?: string | null;
    }>;
    isLiked?: boolean;
    isPurchased?: boolean;
  };
}

export function PostCard({ post }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const utils = trpc.useUtils();

  const toggleLike = trpc.posts.toggleLike.useMutation({
    onMutate: () => {
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    },
    onError: () => {
      setIsLiked(isLiked);
      setLikeCount(likeCount);
    },
  });

  return (
    <motion.article
      className="bg-card border border-border rounded-2xl overflow-hidden hover:border-pink-500/30 transition-all duration-300"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Post header */}
      <div className="flex items-center gap-3 p-4">
        <Link href={`/c/${post.creatorProfile.slug}`}>
          {post.creatorProfile.avatarUrl ? (
            <img
              src={post.creatorProfile.avatarUrl}
              alt={post.creatorProfile.displayName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-border hover:ring-pink-500 transition-all"
            />
          ) : (
            <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold ring-2 ring-border hover:ring-pink-500 transition-all">
              {post.creatorProfile.displayName[0]?.toUpperCase()}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <Link
            href={`/c/${post.creatorProfile.slug}`}
            className="font-semibold text-sm hover:text-pink-500 transition-colors flex items-center gap-1"
          >
            {post.creatorProfile.displayName}
            {post.creatorProfile.isVerified && (
              <Verified className="w-3.5 h-3.5 text-pink-500" fill="currentColor" />
            )}
          </Link>
          <p className="text-xs text-muted-foreground">
            {post.publishedAt ? formatRelativeTime(post.publishedAt) : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {post.isPinned && (
            <Pin className="w-4 h-4 text-pink-500" />
          )}
          {post.isPaid && !post.isPurchased && (
            <span className="text-xs bg-pink-500/10 text-pink-500 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {formatCurrency(post.price ?? 0)}
            </span>
          )}
          {post.isLocked && !post.isPaid && (
            <Lock className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Title */}
      {post.title && (
        <div className="px-4 pb-2">
          <p className="font-semibold">{post.title}</p>
        </div>
      )}

      {/* Body text */}
      {post.body && (
        <div className="px-4 pb-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {post.isLocked && post.body.length > 100
              ? post.body.slice(0, 100) + "..."
              : post.body}
          </p>
          {post.isLocked && post.body.length > 100 && (
            <span className="text-pink-500 text-sm">Read more</span>
          )}
        </div>
      )}

      {/* Media */}
      {post.media.length > 0 && (
        <div className="relative">
          {post.isLocked ? (
            <PaywallOverlay
              post={post}
              firstMedia={post.media[0]!}
            />
          ) : (
            <MediaViewer media={post.media} />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 p-4">
        <button
          onClick={() => toggleLike.mutate({ postId: post.id })}
          className={cn(
            "flex items-center gap-1.5 text-sm transition-colors",
            isLiked
              ? "text-pink-500"
              : "text-muted-foreground hover:text-pink-500"
          )}
        >
          <Heart
            className="w-5 h-5 transition-transform hover:scale-110"
            fill={isLiked ? "currentColor" : "none"}
          />
          <span>{likeCount}</span>
        </button>

        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <MessageCircle className="w-5 h-5" />
          <span>{post.commentCount}</span>
        </button>
      </div>
    </motion.article>
  );
}
