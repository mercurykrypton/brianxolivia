"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Verified, Users } from "lucide-react";
import { formatCompactNumber, formatCurrency } from "@/lib/utils";

interface CreatorCardProps {
  creator: {
    id: string;
    displayName: string;
    slug: string;
    bio?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    tags: string[];
    isVerified: boolean;
    subscriberCount: number;
    subscriptionTiers?: Array<{ price: number; name: string }>;
  };
}

export function CreatorCard({ creator }: CreatorCardProps) {
  const lowestTier = creator.subscriptionTiers?.[0];

  return (
    <Link href={`/c/${creator.slug}`}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="bg-card border border-border rounded-2xl overflow-hidden hover:border-pink-500/40 hover:shadow-lg hover:shadow-pink-500/10 transition-all duration-300 group"
      >
        {/* Banner */}
        <div className="h-28 relative overflow-hidden">
          {creator.bannerUrl ? (
            <img
              src={creator.bannerUrl}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-purple-500/20" />
          )}
        </div>

        {/* Avatar */}
        <div className="px-4 -mt-8 pb-4">
          <div className="relative w-16 h-16 mb-2">
            {creator.avatarUrl ? (
              <img
                src={creator.avatarUrl}
                alt={creator.displayName}
                className="w-16 h-16 rounded-full object-cover border-3 border-card ring-2 ring-border group-hover:ring-pink-500/50 transition-all"
              />
            ) : (
              <div className="w-16 h-16 rounded-full gradient-bg border-3 border-card ring-2 ring-border group-hover:ring-pink-500/50 transition-all flex items-center justify-center text-white font-bold text-xl">
                {creator.displayName[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-1 group-hover:text-pink-500 transition-colors">
                {creator.displayName}
                {creator.isVerified && (
                  <Verified
                    className="w-4 h-4 text-pink-500"
                    fill="currentColor"
                  />
                )}
              </h3>
              <p className="text-xs text-muted-foreground">@{creator.slug}</p>
            </div>
          </div>

          {creator.bio && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {creator.bio}
            </p>
          )}

          {/* Tags */}
          {creator.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-2">
              {creator.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {formatCompactNumber(creator.subscriberCount)}
            </span>

            {lowestTier ? (
              <span className="text-xs font-medium text-pink-500">
                From {formatCurrency(lowestTier.price)}/mo
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Free</span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
