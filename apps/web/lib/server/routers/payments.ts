import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  creatorProcedure,
} from "../trpc";
import { stripe, getOrCreateStripeCustomer } from "../../stripe";
import { paginationSchema } from "@workspace/schemas";

export const paymentsRouter = createTRPCRouter({
  // Get saved payment methods
  getPaymentMethods: protectedProcedure.query(async ({ ctx }) => {
    const methods = await ctx.prisma.paymentMethod.findMany({
      where: { userId: ctx.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return methods;
  }),

  // Add payment method via Stripe SetupIntent
  createSetupIntent: protectedProcedure.mutation(async ({ ctx }) => {
    const customerId = await getOrCreateStripeCustomer({
      userId: ctx.user.id,
      email: ctx.user.email,
    });

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      metadata: { userId: ctx.user.id },
    });

    return {
      clientSecret: setupIntent.client_secret!,
      customerId,
    };
  }),

  // Save payment method after setup
  savePaymentMethod: protectedProcedure
    .input(
      z.object({
        paymentMethodId: z.string(),
        setDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const customerId = await getOrCreateStripeCustomer({
        userId: ctx.user.id,
        email: ctx.user.email,
      });

      // Attach to customer if not already
      const pm = await stripe.paymentMethods.retrieve(input.paymentMethodId);

      if (!pm.customer) {
        await stripe.paymentMethods.attach(input.paymentMethodId, {
          customer: customerId,
        });
      }

      if (input.setDefault) {
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: input.paymentMethodId,
          },
        });

        // Update all to not default
        await ctx.prisma.paymentMethod.updateMany({
          where: { userId: ctx.user.id },
          data: { isDefault: false },
        });
      }

      // Save to DB
      const saved = await ctx.prisma.paymentMethod.upsert({
        where: {
          stripePaymentMethodId: input.paymentMethodId,
        },
        create: {
          userId: ctx.user.id,
          stripePaymentMethodId: input.paymentMethodId,
          stripeCustomerId: customerId,
          type: pm.type,
          last4: pm.card?.last4 ?? null,
          brand: pm.card?.brand ?? null,
          expMonth: pm.card?.exp_month ?? null,
          expYear: pm.card?.exp_year ?? null,
          isDefault: input.setDefault,
        },
        update: {
          isDefault: input.setDefault,
        },
      });

      return saved;
    }),

  // Remove payment method
  removePaymentMethod: protectedProcedure
    .input(z.object({ paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pm = await ctx.prisma.paymentMethod.findFirst({
        where: {
          userId: ctx.user.id,
          stripePaymentMethodId: input.paymentMethodId,
        },
      });

      if (!pm) throw new TRPCError({ code: "NOT_FOUND" });

      await stripe.paymentMethods.detach(input.paymentMethodId);
      await ctx.prisma.paymentMethod.delete({ where: { id: pm.id } });

      return { success: true };
    }),

  // Set default payment method
  setDefault: protectedProcedure
    .input(z.object({ paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pm = await ctx.prisma.paymentMethod.findFirst({
        where: {
          userId: ctx.user.id,
          stripePaymentMethodId: input.paymentMethodId,
        },
      });

      if (!pm) throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.prisma.paymentMethod.updateMany({
        where: { userId: ctx.user.id },
        data: { isDefault: false },
      });

      await ctx.prisma.paymentMethod.update({
        where: { id: pm.id },
        data: { isDefault: true },
      });

      await stripe.customers.update(pm.stripeCustomerId, {
        invoice_settings: { default_payment_method: input.paymentMethodId },
      });

      return { success: true };
    }),

  // Get payout history (creator)
  getPayouts: creatorProcedure
    .input(paginationSchema)
    .query(async ({ ctx, input }) => {
      const payouts = await ctx.prisma.payout.findMany({
        where: { creatorProfileId: ctx.creatorProfile.id },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: string | undefined;
      if (payouts.length > input.limit) {
        const nextItem = payouts.pop();
        nextCursor = nextItem?.id;
      }

      return { items: payouts, nextCursor, hasMore: !!nextCursor };
    }),

  // Get transaction history
  getTransactions: protectedProcedure
    .input(
      paginationSchema.extend({
        type: z
          .enum([
            "SUBSCRIPTION",
            "TIP",
            "PPV_MESSAGE",
            "PPV_POST",
            "CONTENT_REQUEST",
            "PAYOUT",
          ])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Parameters<typeof ctx.prisma.transaction.findMany>[0]["where"] = {
        OR: [
          { userId: ctx.user.id },
          ...(ctx.user.creatorProfile
            ? [{ creatorProfileId: ctx.user.creatorProfile.id }]
            : []),
        ],
        ...(input.type && { type: input.type }),
      };

      const transactions = await ctx.prisma.transaction.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          creatorProfile: {
            select: { displayName: true, slug: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (transactions.length > input.limit) {
        const nextItem = transactions.pop();
        nextCursor = nextItem?.id;
      }

      return { items: transactions, nextCursor, hasMore: !!nextCursor };
    }),

  // Get Stripe Connect account status (creator)
  getConnectStatus: creatorProcedure.query(async ({ ctx }) => {
    const creator = await ctx.prisma.creatorProfile.findUnique({
      where: { id: ctx.creatorProfile.id },
      select: { stripeAccountId: true, stripeOnboardingComplete: true },
    });

    if (!creator?.stripeAccountId) {
      return { connected: false, onboardingComplete: false };
    }

    try {
      const account = await stripe.accounts.retrieve(creator.stripeAccountId);

      const onboardingComplete =
        account.charges_enabled && account.payouts_enabled;

      // Update DB if status changed
      if (onboardingComplete !== creator.stripeOnboardingComplete) {
        await ctx.prisma.creatorProfile.update({
          where: { id: ctx.creatorProfile.id },
          data: { stripeOnboardingComplete: onboardingComplete },
        });
      }

      return {
        connected: true,
        onboardingComplete,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        currentlyDue: account.requirements?.currently_due ?? [],
      };
    } catch {
      return { connected: false, onboardingComplete: false };
    }
  }),

  // Get available balance (creator)
  getBalance: creatorProcedure.query(async ({ ctx }) => {
    const creator = await ctx.prisma.creatorProfile.findUnique({
      where: { id: ctx.creatorProfile.id },
      select: { stripeAccountId: true },
    });

    if (!creator?.stripeAccountId) {
      return { available: 0, pending: 0 };
    }

    const balance = await stripe.balance.retrieve({
      stripeAccount: creator.stripeAccountId,
    });

    const available =
      balance.available.find((b) => b.currency === "usd")?.amount ?? 0;
    const pending =
      balance.pending.find((b) => b.currency === "usd")?.amount ?? 0;

    return {
      available: available / 100,
      pending: pending / 100,
    };
  }),
});
