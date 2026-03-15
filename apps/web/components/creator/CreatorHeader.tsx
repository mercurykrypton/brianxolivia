"use client";

import { Verified, Users, FileText, Globe, Twitter, Instagram } from "lucide-react";
import { formatCompactNumber } from "@/lib/utils";

interface CreatorHeaderProps {
  creator: {
    displayName: string;
    slug: string;
    bio?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    tags: string[];
    isVerified: boolean;
    subscriberCount: number;
    postCount: number;
    websiteUrl?: string | null;
    twitterHandle?: string | null;
    instagramHandle?: string | null;
  };
}

export function CreatorHeader({ creator }: CreatorHeaderProps) {
  return (
    <div>
      {/* Banner */}
      <div className="h-48 md:h-64 relative overflow-hidden bg-gradient-to-br from-pink-500/20 to-purple-500/20">
        {creator.bannerUrl && (
          <img
            src={creator.bannerUrl}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Profile */}
      <div className="px-4 md:px-6 -mt-16 pb-4">
        {creator.avatarUrl ? (
          <img
            src={creator.avatarUrl}
            alt={creator.displayName}
            className="w-28 h-28 rounded-full object-cover border-4 border-background shadow-xl mb-3"
          />
        ) : (
          <div className="w-28 h-28 rounded-full gradient-bg border-4 border-background shadow-xl mb-3 flex items-center justify-center text-white font-bold text-4xl">
            {creator.displayName[0]?.toUpperCase()}
          </div>
        )}

        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold">{creator.displayName}</h1>
          {creator.isVerified && (
            <Verified className="w-5 h-5 text-pink-500" fill="currentColor" />
          )}
        </div>
        <p className="text-muted-foreground text-sm">@{creator.slug}</p>

        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">
              {formatCompactNumber(creator.subscriberCount)}
            </strong>{" "}
            subscribers
          </span>
          <span>
            <strong className="text-foreground">
              {creator.postCount}
            </strong>{" "}
            posts
          </span>
        </div>

        {creator.bio && (
          <p className="mt-3 text-sm max-w-lg">{creator.bio}</p>
        )}
      </div>
    </div>
  );
}
