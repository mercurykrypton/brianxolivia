// Brivia - Shared TypeScript Types

export type UserRole = "FAN" | "CREATOR" | "ADMIN";
export type ContentType = "PHOTO" | "VIDEO" | "TEXT" | "BUNDLE";
export type MediaType = "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
export type SubscriptionStatus =
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "TRIALING"
  | "INCOMPLETE"
  | "PAUSED";
export type BillingInterval = "MONTHLY" | "QUARTERLY" | "ANNUALLY";
export type RequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "REJECTED"
  | "CANCELED";
export type PayoutStatus =
  | "PENDING"
  | "IN_TRANSIT"
  | "PAID"
  | "FAILED"
  | "CANCELED";
export type TransactionType =
  | "SUBSCRIPTION"
  | "TIP"
  | "PPV_MESSAGE"
  | "PPV_POST"
  | "CONTENT_REQUEST"
  | "PAYOUT"
  | "REFUND"
  | "PLATFORM_FEE";
export type NotificationType =
  | "NEW_SUBSCRIBER"
  | "NEW_TIP"
  | "NEW_MESSAGE"
  | "NEW_COMMENT"
  | "NEW_LIKE"
  | "POST_PUBLISHED"
  | "CONTENT_REQUEST"
  | "PAYOUT_SENT"
  | "SUBSCRIPTION_RENEWED"
  | "SUBSCRIPTION_CANCELED"
  | "VERIFICATION_APPROVED"
  | "SYSTEM";
export type VerificationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REQUIRES_RESUBMISSION";

// ─── API Response Types ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

// ─── Creator Types ───────────────────────────────────────────────────────────

export interface PublicCreatorProfile {
  id: string;
  displayName: string;
  slug: string;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  tags: string[];
  isVerified: boolean;
  subscriberCount: number;
  postCount: number;
  subscriptionTiers: PublicSubscriptionTier[];
}

export interface PublicSubscriptionTier {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  interval: BillingInterval;
  dmAccess: boolean;
  exclusiveContent: boolean;
  requestAccess: boolean;
  color?: string | null;
}

// ─── Post Types ──────────────────────────────────────────────────────────────

export interface PostWithMedia {
  id: string;
  title?: string | null;
  body?: string | null;
  contentType: ContentType;
  isPaid: boolean;
  price?: number | null;
  isLocked: boolean;
  likeCount: number;
  commentCount: number;
  publishedAt?: Date | null;
  creatorProfile: {
    id: string;
    displayName: string;
    slug: string;
    avatarUrl?: string | null;
    isVerified: boolean;
  };
  media: MediaItem[];
  isLiked?: boolean;
  isPurchased?: boolean;
}

export interface MediaItem {
  id: string;
  mediaType: MediaType;
  url?: string; // signed URL (only if unlocked)
  thumbnailUrl?: string;
  blurHash?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  muxPlaybackId?: string | null;
}

// ─── Message Types ────────────────────────────────────────────────────────────

export interface MessageWithSender {
  id: string;
  conversationId: string;
  body?: string | null;
  mediaUrl?: string | null;
  isPPV: boolean;
  ppvPrice?: number | null;
  ppvUnlocked: boolean;
  isRead: boolean;
  tipAmount?: number | null;
  createdAt: Date;
  sender: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

// ─── Dashboard / Analytics Types ─────────────────────────────────────────────

export interface CreatorStats {
  totalEarnings: number;
  monthlyEarnings: number;
  subscriberCount: number;
  newSubscribersThisMonth: number;
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
}

export interface EarningsDataPoint {
  date: string;
  earnings: number;
  subscribers: number;
  tips: number;
}

// ─── Ably / Real-time Types ──────────────────────────────────────────────────

export interface AblyMessagePayload {
  type: "new_message" | "message_read" | "typing" | "ppv_unlocked";
  data: unknown;
}

export interface TypingIndicator {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

// ─── Upload Types ────────────────────────────────────────────────────────────

export interface PresignedUploadData {
  uploadUrl: string;
  key: string;
  expiresAt: number;
  publicUrl: string;
}

export interface MuxUploadData {
  uploadUrl: string;
  uploadId: string;
  assetId?: string;
}

// ─── Stripe Types ─────────────────────────────────────────────────────────────

export interface StripeConnectOnboarding {
  url: string;
  accountId: string;
}

export interface CheckoutSessionData {
  sessionId: string;
  url: string;
}
