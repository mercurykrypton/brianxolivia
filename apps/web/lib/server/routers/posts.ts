import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  creatorProcedure,
} from "../trpc";
import { createPostSchema, updatePostSchema, paginationSchema } from "@workspace/schemas";
import { getPublicUrl, createPresignedDownloadUrl } from "../../r2";
import { createSignedPlaybackUrl, createSignedThumbnailUrl } from "../../mux";
import { publishCreatorUpdate, AblyEvents } from "../../ably";
import { publishNotification } from "../../ably";

// Helper to resolve media URLs based on access
async function resolveMediaUrl(
  media: {
    mediaType: string;
    r2Key: string | null;
    muxPlaybackId: string | null;
    thumbnailKey: string | null;
    blurHash: string | null;
    width: number | null;
    height: number | null;
    duration: number | null;
    id: string;
  },
  isUnlocked: boolean
): Promise<{
  id: string;
  mediaType: string;
  url?: string;
  thumbnailUrl?: string;
  blurHash: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  muxPlaybackId?: string | null;
}> {
  if (!isUnlocked) {
    // Return only blur hash for locked content
    return {
      id: media.id,
      mediaType: media.mediaType,
      blurHash: media.blurHash,
      width: media.width,
      height: media.height,
      duration: media.duration,
      thumbnailUrl: media.thumbnailKey ? getPublicUrl(media.thumbnailKey) : undefined,
    };
  }

  let url: string | undefined;
  let thumbnailUrl: string | undefined;

  if (media.mediaType === "VIDEO" && media.muxPlaybackId) {
    url = await createSignedPlaybackUrl(media.muxPlaybackId);
    thumbnailUrl = await createSignedThumbnailUrl(media.muxPlaybackId);
  } else if (media.r2Key) {
    url = await createPresignedDownloadUrl(media.r2Key);
    thumbnailUrl = media.thumbnailKey
      ? await createPresignedDownloadUrl(media.thumbnailKey)
      : undefined;
  }

  return {
    id: media.id,
    mediaType: media.mediaType,
    url,
    thumbnailUrl,
    blurHash: media.blurHash,
    width: media.width,
    height: media.height,
    duration: media.duration,
    muxPlaybackId: isUnlocked ? media.muxPlaybackId : null,
  };
}

export const postsRouter = createTRPCRouter({
  // Get feed posts (subscribed creators + public)
  getFeed: protectedProcedure
    .input(paginationSchema)
    .query(async ({ ctx, input }) => {
      const { cursor, limit } = input;

      // Get creators the user is subscribed to
      const subscriptions = await ctx.prisma.subscription.findMany({
        where: {
          subscriberId: ctx.user.id,
          status: { in: ["ACTIVE", "TRIALING"] },
        },
        select: {
          tier: { select: { creatorProfileId: true, id: true } },
        },
      });

      const subscribedCreatorIds = subscriptions.map(
        (s) => s.tier.creatorProfileId
      );
      const subscribedTierIds = subscriptions.map((s) => s.tier.id);

      const posts = await ctx.prisma.post.findMany({
        where: {
          isPublished: true,
          publishedAt: { lte: new Date() },
          OR: [
            // Posts from subscribed creators (check tier access)
            {
              creatorProfileId: { in: subscribedCreatorIds },
              OR: [
                { isPaid: false, requiredTierId: null },
                { requiredTierId: { in: subscribedTierIds } },
              ],
            },
            // Free public posts from any creator
            {
              isPaid: false,
              requiredTierId: null,
            },
          ],
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { publishedAt: "desc" },
        include: {
          creatorProfile: {
            select: {
              id: true,
              displayName: true,
              slug: true,
              avatarKey: true,
              isVerified: true,
            },
          },
          media: {
            orderBy: { sortOrder: "asc" },
          },
          _count: {
            select: { likes: true, comments: true },
          },
          likes: {
            where: { userId: ctx.user.id },
            select: { id: true },
          },
          purchases: {
            where: { userId: ctx.user.id },
            select: { id: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem?.id;
      }

      // Determine unlock status for each post
      const items = await Promise.all(
        posts.map(async (post) => {
          const isSubscribedToCreator = subscribedCreatorIds.includes(
            post.creatorProfileId
          );
          const hasTierAccess =
            !post.requiredTierId ||
            subscribedTierIds.includes(post.requiredTierId);
          const hasPurchased = post.purchases.length > 0;

          const isUnlocked =
            (!post.isPaid || hasPurchased) &&
            (!post.requiredTierId || hasTierAccess || hasPurchased);

          const resolvedMedia = await Promise.all(
            post.media.map((m) => resolveMediaUrl(m, isUnlocked))
          );

          return {
            id: post.id,
            title: post.title,
            body: isUnlocked ? post.body : post.body?.slice(0, 100),
            contentType: post.contentType,
            isPaid: post.isPaid,
            price: post.price,
            isLocked: !isUnlocked,
            likeCount: post._count.likes,
            commentCount: post._count.comments,
            publishedAt: post.publishedAt,
            isPinned: post.isPinned,
            creatorProfile: {
              ...post.creatorProfile,
              avatarUrl: post.creatorProfile.avatarKey
                ? getPublicUrl(post.creatorProfile.avatarKey)
                : null,
            },
            media: resolvedMedia,
            isLiked: post.likes.length > 0,
            isPurchased: hasPurchased,
          };
        })
      );

      return { items, nextCursor, hasMore: !!nextCursor };
    }),

  // Get creator's posts (public view)
  getCreatorPosts: publicProcedure
    .input(
      paginationSchema.extend({
        creatorProfileId: z.string(),
        contentType: z.enum(["PHOTO", "VIDEO", "TEXT", "BUNDLE"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit, creatorProfileId, contentType } = input;

      // Check user's subscription to this creator
      let subscribedTierIds: string[] = [];
      let hasPurchasedPostIds: string[] = [];

      if (ctx.user?.id) {
        const subs = await ctx.prisma.subscription.findMany({
          where: {
            subscriberId: ctx.user.id,
            tier: { creatorProfileId },
            status: { in: ["ACTIVE", "TRIALING"] },
          },
          select: { tier: { select: { id: true } } },
        });
        subscribedTierIds = subs.map((s) => s.tier.id);

        const purchases = await ctx.prisma.postPurchase.findMany({
          where: { userId: ctx.user.id, post: { creatorProfileId } },
          select: { postId: true },
        });
        hasPurchasedPostIds = purchases.map((p) => p.postId);
      }

      const posts = await ctx.prisma.post.findMany({
        where: {
          creatorProfileId,
          isPublished: true,
          ...(contentType && { contentType }),
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        include: {
          media: { orderBy: { sortOrder: "asc" } },
          _count: { select: { likes: true, comments: true } },
          likes: ctx.user?.id
            ? { where: { userId: ctx.user.id }, select: { id: true } }
            : false,
        },
      });

      let nextCursor: string | undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem?.id;
      }

      const items = await Promise.all(
        posts.map(async (post) => {
          const hasTierAccess =
            !post.requiredTierId ||
            subscribedTierIds.includes(post.requiredTierId);
          const hasPurchased = hasPurchasedPostIds.includes(post.id);
          const isUnlocked =
            (!post.isPaid || hasPurchased) &&
            (subscribedTierIds.length > 0 || !post.requiredTierId || hasPurchased);

          const resolvedMedia = await Promise.all(
            post.media.map((m) => resolveMediaUrl(m, isUnlocked))
          );

          return {
            id: post.id,
            title: post.title,
            body: isUnlocked ? post.body : null,
            contentType: post.contentType,
            isPaid: post.isPaid,
            price: post.price,
            isLocked: !isUnlocked,
            likeCount: post._count.likes,
            commentCount: post._count.comments,
            publishedAt: post.publishedAt,
            isPinned: post.isPinned,
            media: resolvedMedia,
            isLiked: Array.isArray(post.likes) ? post.likes.length > 0 : false,
            isPurchased: hasPurchased,
          };
        })
      );

      return { items, nextCursor, hasMore: !!nextCursor };
    }),

  // Get single post
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.id },
        include: {
          creatorProfile: {
            select: {
              id: true,
              displayName: true,
              slug: true,
              avatarKey: true,
              isVerified: true,
              userId: true,
            },
          },
          media: { orderBy: { sortOrder: "asc" } },
          _count: { select: { likes: true, comments: true } },
          likes: { where: { userId: ctx.user.id }, select: { id: true } },
          purchases: { where: { userId: ctx.user.id }, select: { id: true } },
        },
      });

      if (!post || !post.isPublished) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Check access
      const isOwner = post.creatorProfile.userId === ctx.user.id;
      let isUnlocked = isOwner;

      if (!isOwner) {
        const hasPurchased = post.purchases.length > 0;

        if (post.requiredTierId) {
          const sub = await ctx.prisma.subscription.findFirst({
            where: {
              subscriberId: ctx.user.id,
              tierId: post.requiredTierId,
              status: { in: ["ACTIVE", "TRIALING"] },
            },
          });
          isUnlocked = !!sub || hasPurchased;
        } else {
          isUnlocked = !post.isPaid || hasPurchased;
        }
      }

      // Increment view count
      await ctx.prisma.post.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } },
      });

      const resolvedMedia = await Promise.all(
        post.media.map((m) => resolveMediaUrl(m, isUnlocked))
      );

      return {
        ...post,
        body: isUnlocked ? post.body : null,
        isLocked: !isUnlocked,
        media: resolvedMedia,
        isLiked: post.likes.length > 0,
        isPurchased: post.purchases.length > 0,
        creatorProfile: {
          ...post.creatorProfile,
          avatarUrl: post.creatorProfile.avatarKey
            ? getPublicUrl(post.creatorProfile.avatarKey)
            : null,
        },
      };
    }),

  // Create post (creator only)
  create: creatorProcedure
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.create({
        data: {
          creatorProfileId: ctx.creatorProfile.id,
          title: input.title,
          body: input.body,
          contentType: input.contentType,
          isPaid: input.isPaid,
          price: input.price,
          requiredTierId: input.requiredTierId,
          isPublished: input.isPublished,
          publishedAt: input.isPublished ? new Date() : null,
          scheduledAt: input.scheduledAt,
        },
      });

      // Update post count
      if (input.isPublished) {
        await ctx.prisma.creatorProfile.update({
          where: { id: ctx.creatorProfile.id },
          data: { postCount: { increment: 1 } },
        });

        // Notify subscribers
        const subscribers = await ctx.prisma.subscription.findMany({
          where: {
            tier: { creatorProfileId: ctx.creatorProfile.id },
            status: { in: ["ACTIVE", "TRIALING"] },
          },
          select: { subscriberId: true },
        });

        await Promise.allSettled(
          subscribers.map(async (sub) => {
            const notification = await ctx.prisma.notification.create({
              data: {
                userId: sub.subscriberId,
                type: "POST_PUBLISHED",
                title: `New post from ${ctx.creatorProfile.displayName}`,
                body: input.title ?? "New content available",
                data: { postId: post.id, creatorSlug: ctx.creatorProfile.slug },
              },
            });

            await publishNotification(sub.subscriberId, {
              id: notification.id,
              type: notification.type,
              title: notification.title,
              body: notification.body,
              data: notification.data,
            });
          })
        );
      }

      return post;
    }),

  // Update post
  update: creatorProcedure
    .input(updatePostSchema)
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.id },
        select: { creatorProfileId: true, isPublished: true },
      });

      if (!post || post.creatorProfileId !== ctx.creatorProfile.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const wasPublished = post.isPublished;
      const isPublishing = input.isPublished && !wasPublished;

      const updated = await ctx.prisma.post.update({
        where: { id: input.id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.body !== undefined && { body: input.body }),
          ...(input.contentType && { contentType: input.contentType }),
          ...(input.isPaid !== undefined && { isPaid: input.isPaid }),
          ...(input.price !== undefined && { price: input.price }),
          ...(input.requiredTierId !== undefined && {
            requiredTierId: input.requiredTierId,
          }),
          ...(input.isPublished !== undefined && {
            isPublished: input.isPublished,
          }),
          ...(isPublishing && { publishedAt: new Date() }),
        },
      });

      if (isPublishing) {
        await ctx.prisma.creatorProfile.update({
          where: { id: ctx.creatorProfile.id },
          data: { postCount: { increment: 1 } },
        });
      }

      return updated;
    }),

  // Delete post
  delete: creatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.id },
        include: { media: true },
      });

      if (!post || post.creatorProfileId !== ctx.creatorProfile.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Delete media from R2/Mux
      const { deleteR2Object } = await import("../../r2");
      const { deleteMuxAsset } = await import("../../mux");

      await Promise.allSettled([
        ...post.media
          .filter((m) => m.r2Key)
          .map((m) => deleteR2Object(m.r2Key!)),
        ...post.media
          .filter((m) => m.muxAssetId)
          .map((m) => deleteMuxAsset(m.muxAssetId!)),
      ]);

      await ctx.prisma.post.delete({ where: { id: input.id } });

      if (post.isPublished) {
        await ctx.prisma.creatorProfile.update({
          where: { id: ctx.creatorProfile.id },
          data: { postCount: { decrement: 1 } },
        });
      }

      return { success: true };
    }),

  // Attach media to post
  addMedia: creatorProcedure
    .input(
      z.object({
        postId: z.string(),
        mediaType: z.enum(["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"]),
        r2Key: z.string().optional(),
        muxAssetId: z.string().optional(),
        muxPlaybackId: z.string().optional(),
        blurHash: z.string().optional(),
        thumbnailKey: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        duration: z.number().optional(),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.postId },
        select: { creatorProfileId: true },
      });

      if (!post || post.creatorProfileId !== ctx.creatorProfile.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.prisma.postMedia.create({ data: input });
    }),

  // Like/unlike post
  toggleLike: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.postLike.findUnique({
        where: { postId_userId: { postId: input.postId, userId: ctx.user.id } },
      });

      if (existing) {
        await ctx.prisma.postLike.delete({ where: { id: existing.id } });
        await ctx.prisma.post.update({
          where: { id: input.postId },
          data: { likeCount: { decrement: 1 } },
        });
        return { liked: false };
      } else {
        await ctx.prisma.postLike.create({
          data: { postId: input.postId, userId: ctx.user.id },
        });
        await ctx.prisma.post.update({
          where: { id: input.postId },
          data: { likeCount: { increment: 1 } },
        });
        return { liked: true };
      }
    }),

  // Get comments for post
  getComments: publicProcedure
    .input(paginationSchema.extend({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      const comments = await ctx.prisma.postComment.findMany({
        where: { postId: input.postId, parentId: null },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              fanProfile: { select: { displayName: true, avatarKey: true } },
              creatorProfile: {
                select: { displayName: true, avatarKey: true },
              },
            },
          },
          replies: {
            take: 3,
            include: {
              user: {
                select: {
                  id: true,
                  fanProfile: { select: { displayName: true, avatarKey: true } },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      let nextCursor: string | undefined;
      if (comments.length > input.limit) {
        const nextItem = comments.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: comments.map((c) => ({
          ...c,
          displayName:
            c.user.creatorProfile?.displayName ??
            c.user.fanProfile?.displayName ??
            "Anonymous",
          avatarUrl: c.user.creatorProfile?.avatarKey
            ? getPublicUrl(c.user.creatorProfile.avatarKey)
            : c.user.fanProfile?.avatarKey
            ? getPublicUrl(c.user.fanProfile.avatarKey)
            : null,
        })),
        nextCursor,
        hasMore: !!nextCursor,
      };
    }),

  // Add comment
  addComment: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        body: z.string().min(1).max(1000),
        parentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.prisma.postComment.create({
        data: {
          postId: input.postId,
          userId: ctx.user.id,
          body: input.body,
          parentId: input.parentId,
        },
      });

      await ctx.prisma.post.update({
        where: { id: input.postId },
        data: { commentCount: { increment: 1 } },
      });

      return comment;
    }),

  // Purchase a PPV post
  purchasePost: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        paymentMethodId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.postId },
        include: {
          creatorProfile: {
            select: {
              id: true,
              stripeAccountId: true,
              userId: true,
              displayName: true,
            },
          },
          purchases: { where: { userId: ctx.user.id } },
        },
      });

      if (!post || !post.isPaid || !post.price) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Post not available for purchase" });
      }

      if (post.purchases.length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already purchased" });
      }

      if (!post.creatorProfile.stripeAccountId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Creator has not set up payments" });
      }

      const {
        getOrCreateStripeCustomer,
        createPaymentIntent,
      } = await import("../../stripe");

      const customerId = await getOrCreateStripeCustomer({
        userId: ctx.user.id,
        email: ctx.user.email,
      });

      const platformFee = post.price * 0.2;
      const netAmount = post.price - platformFee;

      const paymentIntent = await createPaymentIntent({
        amount: post.price,
        customerId,
        paymentMethodId: input.paymentMethodId,
        creatorStripeAccountId: post.creatorProfile.stripeAccountId,
        description: `Brivia: PPV post "${post.title ?? "Unlocked post"}"`,
        metadata: {
          postId: post.id,
          buyerId: ctx.user.id,
          creatorProfileId: post.creatorProfile.id,
        },
        confirm: true,
      });

      // Create purchase record
      await ctx.prisma.postPurchase.create({
        data: {
          postId: post.id,
          userId: ctx.user.id,
          stripePaymentId: paymentIntent.id,
          amount: post.price,
        },
      });

      // Record transaction
      await ctx.prisma.transaction.create({
        data: {
          type: "PPV_POST",
          userId: ctx.user.id,
          creatorProfileId: post.creatorProfile.id,
          amount: post.price,
          platformFee,
          netAmount,
          stripeId: paymentIntent.id,
          description: `PPV: ${post.title ?? "Post"}`,
        },
      });

      return { success: true, paymentIntentId: paymentIntent.id };
    }),

  // Pin/unpin post
  togglePin: creatorProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.postId },
        select: { creatorProfileId: true, isPinned: true },
      });

      if (!post || post.creatorProfileId !== ctx.creatorProfile.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Unpin all posts first if pinning
      if (!post.isPinned) {
        await ctx.prisma.post.updateMany({
          where: { creatorProfileId: ctx.creatorProfile.id, isPinned: true },
          data: { isPinned: false },
        });
      }

      await ctx.prisma.post.update({
        where: { id: input.postId },
        data: { isPinned: !post.isPinned },
      });

      return { isPinned: !post.isPinned };
    }),

  // Get creator's own posts (dashboard)
  getMyPosts: creatorProcedure
    .input(paginationSchema.extend({
      isPublished: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const posts = await ctx.prisma.post.findMany({
        where: {
          creatorProfileId: ctx.creatorProfile.id,
          ...(input.isPublished !== undefined && { isPublished: input.isPublished }),
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          media: { take: 1, orderBy: { sortOrder: "asc" } },
          _count: { select: { likes: true, comments: true, purchases: true } },
        },
      });

      let nextCursor: string | undefined;
      if (posts.length > input.limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: posts.map((p) => ({
          ...p,
          media: p.media.map((m) => ({
            ...m,
            thumbnailUrl: m.thumbnailKey ? getPublicUrl(m.thumbnailKey) : null,
          })),
          likes: p._count.likes,
          comments: p._count.comments,
          purchases: p._count.purchases,
        })),
        nextCursor,
        hasMore: !!nextCursor,
      };
    }),
});
