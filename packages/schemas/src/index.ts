import { z } from "zod";

// ─── Auth / Onboarding ───────────────────────────────────────────────────────

export const onboardingFanSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50),
});

export const onboardingCreatorSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50),
  slug: z
    .string()
    .min(3, "URL must be at least 3 characters")
    .max(30)
    .regex(
      /^[a-z0-9-]+$/,
      "Only lowercase letters, numbers, and hyphens allowed"
    ),
  bio: z.string().max(500).optional(),
  tags: z.array(z.string()).max(10).optional(),
});

// ─── Creator Profile ─────────────────────────────────────────────────────────

export const updateCreatorProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  bio: z.string().max(1000).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  twitterHandle: z.string().max(50).optional(),
  instagramHandle: z.string().max(50).optional(),
});

// ─── Subscription Tier ───────────────────────────────────────────────────────

export const createSubscriptionTierSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  price: z.number().min(0.99).max(999),
  interval: z.enum(["MONTHLY", "QUARTERLY", "ANNUALLY"]).default("MONTHLY"),
  dmAccess: z.boolean().default(false),
  exclusiveContent: z.boolean().default(true),
  requestAccess: z.boolean().default(false),
  maxDmMessages: z.number().int().positive().optional(),
  color: z.string().optional(),
});

export const updateSubscriptionTierSchema =
  createSubscriptionTierSchema.partial().extend({
    id: z.string(),
    isActive: z.boolean().optional(),
  });

// ─── Posts ───────────────────────────────────────────────────────────────────

export const createPostSchema = z.object({
  title: z.string().max(200).optional(),
  body: z.string().max(10000).optional(),
  contentType: z.enum(["PHOTO", "VIDEO", "TEXT", "BUNDLE"]),
  isPaid: z.boolean().default(false),
  price: z.number().min(0.99).optional(),
  requiredTierId: z.string().optional(),
  isPublished: z.boolean().default(false),
  scheduledAt: z.date().optional(),
  mediaIds: z.array(z.string()).optional(), // R2 keys or mux asset IDs
});

export const updatePostSchema = createPostSchema.partial().extend({
  id: z.string(),
});

// ─── Messages ────────────────────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  conversationId: z.string(),
  body: z.string().max(2000).optional(),
  mediaKey: z.string().optional(),
  isPPV: z.boolean().default(false),
  ppvPrice: z.number().min(0.99).optional(),
  tipAmount: z.number().min(1).optional(),
});

// ─── Tips ────────────────────────────────────────────────────────────────────

export const sendTipSchema = z.object({
  creatorProfileId: z.string(),
  amount: z.number().min(1).max(10000),
  message: z.string().max(200).optional(),
  isAnonymous: z.boolean().default(false),
  paymentMethodId: z.string(),
});

// ─── Content Requests ────────────────────────────────────────────────────────

export const createContentRequestSchema = z.object({
  creatorProfileId: z.string(),
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(2000),
  budget: z.number().min(5).max(5000),
  paymentMethodId: z.string(),
});

export const updateContentRequestSchema = z.object({
  id: z.string(),
  status: z.enum(["ACCEPTED", "IN_PROGRESS", "DELIVERED", "REJECTED"]),
  rejectionReason: z.string().max(500).optional(),
  deliveredPostId: z.string().optional(),
});

// ─── Pagination ───────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const infiniteScrollSchema = paginationSchema;

// ─── Exports ──────────────────────────────────────────────────────────────────

export type OnboardingFanInput = z.infer<typeof onboardingFanSchema>;
export type OnboardingCreatorInput = z.infer<typeof onboardingCreatorSchema>;
export type UpdateCreatorProfileInput = z.infer<
  typeof updateCreatorProfileSchema
>;
export type CreateSubscriptionTierInput = z.infer<
  typeof createSubscriptionTierSchema
>;
export type UpdateSubscriptionTierInput = z.infer<
  typeof updateSubscriptionTierSchema
>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type SendTipInput = z.infer<typeof sendTipSchema>;
export type CreateContentRequestInput = z.infer<
  typeof createContentRequestSchema
>;
export type UpdateContentRequestInput = z.infer<
  typeof updateContentRequestSchema
>;
export type PaginationInput = z.infer<typeof paginationSchema>;
