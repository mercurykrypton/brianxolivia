import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  creatorProcedure,
} from "../trpc";
import { updateCreatorProfileSchema, paginationSchema } from "@workspace/schemas";
import { getPublicUrl, createPresignedDownloadUrl } from "../../r2";
import { createConnectAccount } from "../../stripe";

export const creatorRouter = createTRPCRouter({
  // Get public creator profile by slug
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const creator = await ctx.prisma.creatorProfile.findUnique({
        where: { slug: input.slug, isActive: true },
        include: {
          subscriptionTiers: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
          },
          _count: {
            select: {
              posts: { where: { isPublished: true } },
              subscriptionTiers: { where: { isActive: true } },
            },
          },
        },
      });

      if (!creator) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found" });
      }

      // Check if current user is subscribed
      let isSubscribed = false;
      let activeSubscription = null;

      if (ctx.user?.id) {
        const sub = await ctx.prisma.subscription.findFirst({
          where: {
            subscriberId: ctx.user.id,
            tier: { creatorProfileId: creator.id },
            status: { in: ["ACTIVE", "TRIALING"] },
          },
          include: { tier: true },
        });
        if (sub) {
          isSubscribed = true;
          activeSubscription = sub;
        }
      }

      return {
        ...creator,
        avatarUrl: creator.avatarKey ? getPublicUrl(creator.avatarKey) : null,
        bannerUrl: creator.bannerKey ? getPublicUrl(creator.bannerKey) : null,
        isSubscribed,
        activeSubscription,
        // Never expose stripeAccountId or userId to public
        stripeAccountId: undefined,
        userId: undefined,
      };
    }),

  // Search/explore creators
  search: publicProcedure
    .input(
      paginationSchema.extend({
        query: z.string().optional(),
        tags: z.array(z.string()).optional(),
        sortBy: z
          .enum(["popular", "new", "trending"])
          .default("popular"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit, query, tags, sortBy } = input;

      const where: NonNullable<Parameters<typeof ctx.prisma.creatorProfile.findMany>[0]>["where"] = {
        isActive: true,
        ...(query && {
          OR: [
            { displayName: { contains: query, mode: "insensitive" } },
            { bio: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
          ],
        }),
        ...(tags && tags.length > 0 && {
          tags: { hasSome: tags },
        }),
      };

      const orderBy: NonNullable<Parameters<typeof ctx.prisma.creatorProfile.findMany>[0]>["orderBy"] =
        sortBy === "new"
          ? { createdAt: "desc" }
          : sortBy === "trending"
          ? { totalEarnings: "desc" }
          : { subscriberCount: "desc" };

      const creators = await ctx.prisma.creatorProfile.findMany({
        where,
        orderBy,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        select: {
          id: true,
          displayName: true,
          slug: true,
          bio: true,
          avatarKey: true,
          bannerKey: true,
          tags: true,
          isVerified: true,
          subscriberCount: true,
          postCount: true,
          subscriptionTiers: {
            where: { isActive: true },
            orderBy: { price: "asc" },
            take: 1,
            select: { price: true, name: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (creators.length > limit) {
        const nextItem = creators.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: creators.map((c) => ({
          ...c,
          avatarUrl: c.avatarKey ? getPublicUrl(c.avatarKey) : null,
          bannerUrl: c.bannerKey ? getPublicUrl(c.bannerKey) : null,
          avatarKey: undefined,
          bannerKey: undefined,
        })),
        nextCursor,
        hasMore: !!nextCursor,
      };
    }),

  // Update creator profile
  updateProfile: creatorProcedure
    .input(updateCreatorProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.prisma.creatorProfile.update({
        where: { id: ctx.creatorProfile.id },
        data: {
          ...(input.displayName && { displayName: input.displayName }),
          ...(input.bio !== undefined && { bio: input.bio }),
          ...(input.tags && { tags: input.tags }),
          ...(input.websiteUrl !== undefined && { websiteUrl: input.websiteUrl || null }),
          ...(input.twitterHandle !== undefined && { twitterHandle: input.twitterHandle || null }),
          ...(input.instagramHandle !== undefined && { instagramHandle: input.instagramHandle || null }),
        },
      });

      return updated;
    }),

  // Update avatar key (after R2 upload)
  updateAvatar: creatorProcedure
    .input(z.object({ r2Key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.creatorProfile.update({
        where: { id: ctx.creatorProfile.id },
        data: { avatarKey: input.r2Key },
      });
      return { url: getPublicUrl(input.r2Key) };
    }),

  // Update banner key (after R2 upload)
  updateBanner: creatorProcedure
    .input(z.object({ r2Key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.creatorProfile.update({
        where: { id: ctx.creatorProfile.id },
        data: { bannerKey: input.r2Key },
      });
      return { url: getPublicUrl(input.r2Key) };
    }),

  // Get Stripe Connect onboarding URL
  getConnectOnboardingUrl: creatorProcedure.mutation(async ({ ctx }) => {
    const creator = await ctx.prisma.creatorProfile.findUnique({
      where: { id: ctx.creatorProfile.id },
    });

    if (!creator) throw new TRPCError({ code: "NOT_FOUND" });

    // If already has account, create new link
    if (creator.stripeAccountId) {
      const { stripe } = await import("../../stripe");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const link = await stripe.accountLinks.create({
        account: creator.stripeAccountId,
        refresh_url: `${appUrl}/earnings?reauth=true`,
        return_url: `${appUrl}/earnings?connected=true`,
        type: "account_onboarding",
      });
      return { url: link.url, accountId: creator.stripeAccountId };
    }

    // Create new account
    const { accountId, onboardingUrl } = await createConnectAccount({
      email: ctx.user.email,
      creatorProfileId: creator.id,
    });

    await ctx.prisma.creatorProfile.update({
      where: { id: creator.id },
      data: { stripeAccountId: accountId },
    });

    return { url: onboardingUrl, accountId };
  }),

  // Get creator dashboard stats
  getDashboardStats: creatorProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalEarnings,
      monthlyEarnings,
      lastMonthEarnings,
      subscriberCount,
      newSubscribersThisMonth,
      totalPosts,
      recentTransactions,
    ] = await Promise.all([
      ctx.prisma.transaction.aggregate({
        where: { creatorProfileId: ctx.creatorProfile.id },
        _sum: { netAmount: true },
      }),
      ctx.prisma.transaction.aggregate({
        where: {
          creatorProfileId: ctx.creatorProfile.id,
          createdAt: { gte: startOfMonth },
        },
        _sum: { netAmount: true },
      }),
      ctx.prisma.transaction.aggregate({
        where: {
          creatorProfileId: ctx.creatorProfile.id,
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { netAmount: true },
      }),
      ctx.prisma.subscription.count({
        where: {
          tier: { creatorProfileId: ctx.creatorProfile.id },
          status: { in: ["ACTIVE", "TRIALING"] },
        },
      }),
      ctx.prisma.subscription.count({
        where: {
          tier: { creatorProfileId: ctx.creatorProfile.id },
          createdAt: { gte: startOfMonth },
        },
      }),
      ctx.prisma.post.count({
        where: { creatorProfileId: ctx.creatorProfile.id, isPublished: true },
      }),
      ctx.prisma.transaction.findMany({
        where: { creatorProfileId: ctx.creatorProfile.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          type: true,
          amount: true,
          netAmount: true,
          createdAt: true,
          description: true,
        },
      }),
    ]);

    const monthlyTotal = monthlyEarnings._sum.netAmount ?? 0;
    const lastMonthTotal = lastMonthEarnings._sum.netAmount ?? 0;
    const growthPercent =
      lastMonthTotal > 0
        ? ((monthlyTotal - lastMonthTotal) / lastMonthTotal) * 100
        : 0;

    return {
      totalEarnings: totalEarnings._sum.netAmount ?? 0,
      monthlyEarnings: monthlyTotal,
      earningsGrowth: growthPercent,
      subscriberCount,
      newSubscribersThisMonth,
      totalPosts,
      recentTransactions,
    };
  }),

  // Get earnings chart data (last 30 days)
  getEarningsChart: creatorProcedure
    .input(
      z.object({
        period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const days =
        input.period === "7d"
          ? 7
          : input.period === "30d"
          ? 30
          : input.period === "90d"
          ? 90
          : 365;

      const since = new Date();
      since.setDate(since.getDate() - days);

      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          creatorProfileId: ctx.creatorProfile.id,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "asc" },
        select: {
          netAmount: true,
          type: true,
          createdAt: true,
        },
      });

      // Group by date
      const byDate = new Map<
        string,
        { earnings: number; tips: number; subscriptions: number }
      >();

      transactions.forEach((t) => {
        const dateKey = t.createdAt.toISOString().split("T")[0]!;
        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, { earnings: 0, tips: 0, subscriptions: 0 });
        }
        const entry = byDate.get(dateKey)!;
        entry.earnings += t.netAmount;
        if (t.type === "TIP") entry.tips += t.netAmount;
        if (t.type === "SUBSCRIPTION") entry.subscriptions += t.netAmount;
      });

      // Fill in missing days
      const result = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0]!;
        result.push({
          date: key,
          ...(byDate.get(key) ?? { earnings: 0, tips: 0, subscriptions: 0 }),
        });
      }

      return result;
    }),

  // Get subscribers list
  getSubscribers: creatorProcedure
    .input(paginationSchema)
    .query(async ({ ctx, input }) => {
      const { cursor, limit } = input;

      const subscriptions = await ctx.prisma.subscription.findMany({
        where: {
          tier: { creatorProfileId: ctx.creatorProfile.id },
          status: { in: ["ACTIVE", "TRIALING"] },
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          tier: { select: { name: true, price: true } },
          subscriber: {
            select: {
              id: true,
              fanProfile: { select: { displayName: true, avatarKey: true } },
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (subscriptions.length > limit) {
        const nextItem = subscriptions.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: subscriptions.map((s) => ({
          id: s.id,
          subscriberId: s.subscriberId,
          displayName: s.subscriber.fanProfile?.displayName ?? "Anonymous",
          avatarUrl: s.subscriber.fanProfile?.avatarKey
            ? getPublicUrl(s.subscriber.fanProfile.avatarKey)
            : null,
          tierName: s.tier.name,
          tierPrice: s.tier.price,
          status: s.status,
          startedAt: s.createdAt,
          currentPeriodEnd: s.currentPeriodEnd,
        })),
        nextCursor,
        hasMore: !!nextCursor,
      };
    }),

  // Update AI agent configuration
  updateAgentConfig: creatorProcedure
    .input(
      z.object({
        isAgent: z.boolean(),
        agentSystemPrompt: z.string().max(4000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.creatorProfile.update({
        where: { id: ctx.creatorProfile.id },
        data: {
          isAgent: input.isAgent,
          agentSystemPrompt: input.agentSystemPrompt ?? null,
        },
      });
      return { success: true };
    }),

  // Get popular tags for explore
  getPopularTags: publicProcedure.query(async ({ ctx }) => {
    const creators = await ctx.prisma.creatorProfile.findMany({
      where: { isActive: true },
      select: { tags: true },
    });

    const tagCounts = new Map<string, number>();
    creators.forEach((c) => {
      c.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));
  }),
});
