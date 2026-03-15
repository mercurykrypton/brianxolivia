import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  creatorProcedure,
  publicProcedure,
} from "../trpc";
import {
  createSubscriptionTierSchema,
  updateSubscriptionTierSchema,
} from "@workspace/schemas";
import {
  createSubscription,
  cancelSubscription,
  createOrUpdateStripeTier,
  getOrCreateStripeCustomer,
} from "../../stripe";
import { publishCreatorUpdate, AblyEvents, publishNotification } from "../../ably";
import { sendNewSubscriberEmail } from "../../resend";

export const subscriptionsRouter = createTRPCRouter({
  // Get all tiers for a creator (public)
  getTiers: publicProcedure
    .input(z.object({ creatorProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.subscriptionTier.findMany({
        where: { creatorProfileId: input.creatorProfileId, isActive: true },
        orderBy: { sortOrder: "asc" },
      });
    }),

  // Create a new subscription tier
  createTier: creatorProcedure
    .input(createSubscriptionTierSchema)
    .mutation(async ({ ctx, input }) => {
      const creator = await ctx.prisma.creatorProfile.findUnique({
        where: { id: ctx.creatorProfile.id },
        select: { stripeAccountId: true, stripeOnboardingComplete: true },
      });

      // If stripe is set up, create the price there too
      let stripePriceId: string | undefined;
      let stripeProductId: string | undefined;

      if (creator?.stripeAccountId && creator.stripeOnboardingComplete) {
        const intervalMap = {
          MONTHLY: "month" as const,
          QUARTERLY: "month" as const, // Quarterly = 3 month recurring
          ANNUALLY: "year" as const,
        };

        const { productId, priceId } = await createOrUpdateStripeTier({
          name: input.name,
          amount: input.price,
          interval: intervalMap[input.interval],
          creatorStripeAccountId: creator.stripeAccountId,
        });

        stripePriceId = priceId;
        stripeProductId = productId;
      }

      const tierCount = await ctx.prisma.subscriptionTier.count({
        where: { creatorProfileId: ctx.creatorProfile.id },
      });

      return ctx.prisma.subscriptionTier.create({
        data: {
          creatorProfileId: ctx.creatorProfile.id,
          name: input.name,
          description: input.description,
          price: input.price,
          interval: input.interval,
          dmAccess: input.dmAccess,
          exclusiveContent: input.exclusiveContent,
          requestAccess: input.requestAccess,
          maxDmMessages: input.maxDmMessages,
          color: input.color,
          sortOrder: tierCount,
          ...(stripePriceId && { stripePriceId }),
          ...(stripeProductId && { stripeProductId }),
        },
      });
    }),

  // Update a tier
  updateTier: creatorProcedure
    .input(updateSubscriptionTierSchema)
    .mutation(async ({ ctx, input }) => {
      const tier = await ctx.prisma.subscriptionTier.findUnique({
        where: { id: input.id },
        select: { creatorProfileId: true, stripeProductId: true, stripePriceId: true },
      });

      if (!tier || tier.creatorProfileId !== ctx.creatorProfile.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const { id, ...data } = input;

      // If price changed and stripe is set up, update stripe price
      if (input.price !== undefined || input.name !== undefined) {
        const creator = await ctx.prisma.creatorProfile.findUnique({
          where: { id: ctx.creatorProfile.id },
          select: { stripeAccountId: true, stripeOnboardingComplete: true },
        });

        if (creator?.stripeAccountId && creator.stripeOnboardingComplete && (input.price || input.name)) {
          const currentTier = await ctx.prisma.subscriptionTier.findUnique({
            where: { id: input.id },
          });

          if (currentTier) {
            const intervalMap = {
              MONTHLY: "month" as const,
              QUARTERLY: "month" as const,
              ANNUALLY: "year" as const,
            };

            const { productId, priceId } = await createOrUpdateStripeTier({
              name: input.name ?? currentTier.name,
              amount: input.price ?? currentTier.price,
              interval: intervalMap[input.interval ?? currentTier.interval],
              creatorStripeAccountId: creator.stripeAccountId,
              existingProductId: tier.stripeProductId ?? undefined,
              existingPriceId: tier.stripePriceId ?? undefined,
            });

            await ctx.prisma.subscriptionTier.update({
              where: { id: input.id },
              data: { stripeProductId: productId, stripePriceId: priceId },
            });
          }
        }
      }

      return ctx.prisma.subscriptionTier.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.price !== undefined && { price: data.price }),
          ...(data.interval !== undefined && { interval: data.interval }),
          ...(data.dmAccess !== undefined && { dmAccess: data.dmAccess }),
          ...(data.exclusiveContent !== undefined && { exclusiveContent: data.exclusiveContent }),
          ...(data.requestAccess !== undefined && { requestAccess: data.requestAccess }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.color !== undefined && { color: data.color }),
        },
      });
    }),

  // Delete a tier
  deleteTier: creatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tier = await ctx.prisma.subscriptionTier.findUnique({
        where: { id: input.id },
        select: {
          creatorProfileId: true,
          _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } },
        },
      });

      if (!tier || tier.creatorProfileId !== ctx.creatorProfile.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (tier._count.subscriptions > 0) {
        // Just deactivate instead of deleting
        return ctx.prisma.subscriptionTier.update({
          where: { id: input.id },
          data: { isActive: false },
        });
      }

      return ctx.prisma.subscriptionTier.delete({ where: { id: input.id } });
    }),

  // Subscribe to a creator tier
  subscribe: protectedProcedure
    .input(
      z.object({
        tierId: z.string(),
        paymentMethodId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tier = await ctx.prisma.subscriptionTier.findUnique({
        where: { id: input.tierId, isActive: true },
        include: {
          creatorProfile: {
            select: {
              id: true,
              stripeAccountId: true,
              displayName: true,
              userId: true,
              user: { select: { email: true } },
            },
          },
        },
      });

      if (!tier) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tier not found" });
      }

      if (!tier.creatorProfile.stripeAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Creator has not set up payments yet",
        });
      }

      if (!tier.stripePriceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Tier pricing not configured",
        });
      }

      // Check if already subscribed
      const existing = await ctx.prisma.subscription.findFirst({
        where: {
          subscriberId: ctx.user.id,
          tierId: input.tierId,
          status: { in: ["ACTIVE", "TRIALING"] },
        },
      });

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Already subscribed" });
      }

      // Get or create Stripe customer
      const customerId = await getOrCreateStripeCustomer({
        userId: ctx.user.id,
        email: ctx.user.email,
      });

      // Create Stripe subscription
      const stripeSubscription = await createSubscription({
        customerId,
        stripePriceId: tier.stripePriceId,
        paymentMethodId: input.paymentMethodId,
        creatorStripeAccountId: tier.creatorProfile.stripeAccountId,
        metadata: {
          subscriberId: ctx.user.id,
          tierId: tier.id,
          creatorProfileId: tier.creatorProfile.id,
        },
      });

      // Create subscription record
      const subscription = await ctx.prisma.subscription.create({
        data: {
          subscriberId: ctx.user.id,
          tierId: tier.id,
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId: customerId,
          status: "ACTIVE",
          currentPeriodStart: stripeSubscription.current_period_start
            ? new Date(stripeSubscription.current_period_start * 1000)
            : new Date(),
          currentPeriodEnd: stripeSubscription.current_period_end
            ? new Date(stripeSubscription.current_period_end * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Update creator subscriber count
      await ctx.prisma.creatorProfile.update({
        where: { id: tier.creatorProfile.id },
        data: { subscriberCount: { increment: 1 } },
      });

      // Record transaction
      await ctx.prisma.transaction.create({
        data: {
          type: "SUBSCRIPTION",
          userId: ctx.user.id,
          creatorProfileId: tier.creatorProfile.id,
          amount: tier.price,
          platformFee: tier.price * 0.2,
          netAmount: tier.price * 0.8,
          stripeId: stripeSubscription.id,
          description: `Subscription: ${tier.name}`,
        },
      });

      // Notify creator
      const creatorNotification = await ctx.prisma.notification.create({
        data: {
          userId: tier.creatorProfile.userId,
          type: "NEW_SUBSCRIBER",
          title: "New subscriber!",
          body: `Someone subscribed to your ${tier.name} tier`,
          data: { tierId: tier.id, subscriptionId: subscription.id },
        },
      });

      await publishNotification(tier.creatorProfile.userId, {
        id: creatorNotification.id,
        type: "NEW_SUBSCRIBER",
        title: creatorNotification.title,
        body: creatorNotification.body,
        data: creatorNotification.data,
      });

      // Send email to creator
      if (tier.creatorProfile.user.email) {
        const fanProfile = await ctx.prisma.fanProfile.findUnique({
          where: { userId: ctx.user.id },
          select: { displayName: true },
        });

        await sendNewSubscriberEmail({
          to: tier.creatorProfile.user.email,
          creatorName: tier.creatorProfile.displayName,
          subscriberName: fanProfile?.displayName ?? "A fan",
          tierName: tier.name,
          amount: tier.price,
        }).catch(console.error);
      }

      return { success: true, subscriptionId: subscription.id };
    }),

  // Cancel a subscription
  cancel: protectedProcedure
    .input(z.object({ subscriptionId: z.string(), immediately: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const subscription = await ctx.prisma.subscription.findUnique({
        where: { id: input.subscriptionId },
        include: {
          tier: {
            select: {
              name: true,
              creatorProfile: {
                select: { id: true, subscriberCount: true, displayName: true },
              },
            },
          },
        },
      });

      if (!subscription || subscription.subscriberId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (subscription.stripeSubscriptionId) {
        await cancelSubscription(
          subscription.stripeSubscriptionId,
          input.immediately
        );
      }

      await ctx.prisma.subscription.update({
        where: { id: input.subscriptionId },
        data: {
          status: input.immediately ? "CANCELED" : "ACTIVE",
          cancelAtPeriodEnd: !input.immediately,
          canceledAt: input.immediately ? new Date() : null,
        },
      });

      if (input.immediately) {
        await ctx.prisma.creatorProfile.update({
          where: { id: subscription.tier.creatorProfile.id },
          data: { subscriberCount: { decrement: 1 } },
        });
      }

      return { success: true };
    }),

  // Get user's active subscriptions
  getMySubscriptions: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.subscription.findMany({
      where: {
        subscriberId: ctx.user.id,
        status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      },
      include: {
        tier: {
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),
});
