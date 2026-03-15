import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  creatorProcedure,
} from "../trpc";
import { sendTipSchema, paginationSchema } from "@workspace/schemas";
import { getOrCreateStripeCustomer, createPaymentIntent } from "../../stripe";
import { publishCreatorUpdate, AblyEvents, publishNotification } from "../../ably";
import { sendNewTipEmail } from "../../resend";
import { getPublicUrl } from "../../r2";

export const tipsRouter = createTRPCRouter({
  // Send a tip to a creator
  send: protectedProcedure.input(sendTipSchema).mutation(async ({ ctx, input }) => {
    const creator = await ctx.prisma.creatorProfile.findUnique({
      where: { id: input.creatorProfileId },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    if (!creator) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found" });
    }

    if (!creator.stripeAccountId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Creator has not set up payments yet",
      });
    }

    if (creator.userId === ctx.user.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You cannot tip yourself",
      });
    }

    const customerId = await getOrCreateStripeCustomer({
      userId: ctx.user.id,
      email: ctx.user.email,
    });

    const platformFee = input.amount * 0.2;
    const netAmount = input.amount - platformFee;

    const paymentIntent = await createPaymentIntent({
      amount: input.amount,
      customerId,
      paymentMethodId: input.paymentMethodId,
      creatorStripeAccountId: creator.stripeAccountId,
      description: `Brivia tip to ${creator.displayName}`,
      metadata: {
        tipSenderId: ctx.user.id,
        creatorProfileId: creator.id,
        isAnonymous: String(input.isAnonymous),
      },
      confirm: true,
    });

    // Create tip record
    const tip = await ctx.prisma.tip.create({
      data: {
        senderId: ctx.user.id,
        creatorProfileId: creator.id,
        amount: input.amount,
        message: input.message,
        stripePaymentId: paymentIntent.id,
        isAnonymous: input.isAnonymous,
      },
    });

    // Record transaction
    await ctx.prisma.transaction.create({
      data: {
        type: "TIP",
        userId: ctx.user.id,
        creatorProfileId: creator.id,
        amount: input.amount,
        platformFee,
        netAmount,
        stripeId: paymentIntent.id,
        description: `Tip to ${creator.displayName}`,
      },
    });

    // Update creator total earnings
    await ctx.prisma.creatorProfile.update({
      where: { id: creator.id },
      data: { totalEarnings: { increment: netAmount } },
    });

    // Update fan total spent
    await ctx.prisma.fanProfile.update({
      where: { userId: ctx.user.id },
      data: { totalSpent: { increment: input.amount } },
    });

    // Get sender name for notification
    const fanProfile = await ctx.prisma.fanProfile.findUnique({
      where: { userId: ctx.user.id },
      select: { displayName: true },
    });

    const senderName =
      input.isAnonymous ? "Anonymous" : (fanProfile?.displayName ?? "A fan");

    // Notify creator via Ably
    const notification = await ctx.prisma.notification.create({
      data: {
        userId: creator.user.id,
        type: "NEW_TIP",
        title: `You received a $${input.amount} tip!`,
        body: input.isAnonymous
          ? `Anonymous sent you a $${input.amount} tip`
          : `${senderName} sent you a $${input.amount} tip${input.message ? `: "${input.message}"` : ""}`,
        data: { tipId: tip.id, amount: input.amount },
      },
    });

    await publishNotification(creator.user.id, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
    }).catch(console.error);

    // Send email
    await sendNewTipEmail({
      to: creator.user.email,
      creatorName: creator.displayName,
      senderName,
      amount: input.amount,
      message: input.message,
    }).catch(console.error);

    return {
      success: true,
      tipId: tip.id,
      paymentIntentId: paymentIntent.id,
    };
  }),

  // Get tips received by creator
  getReceived: creatorProcedure
    .input(paginationSchema)
    .query(async ({ ctx, input }) => {
      const tips = await ctx.prisma.tip.findMany({
        where: { creatorProfileId: ctx.creatorProfile.id },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          sender: {
            select: {
              id: true,
              fanProfile: { select: { displayName: true, avatarKey: true } },
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (tips.length > input.limit) {
        const nextItem = tips.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: tips.map((t) => ({
          id: t.id,
          amount: t.amount,
          message: t.message,
          isAnonymous: t.isAnonymous,
          createdAt: t.createdAt,
          sender: t.isAnonymous
            ? { displayName: "Anonymous", avatarUrl: null }
            : {
                displayName:
                  t.sender.fanProfile?.displayName ?? "Unknown",
                avatarUrl: t.sender.fanProfile?.avatarKey
                  ? getPublicUrl(t.sender.fanProfile.avatarKey)
                  : null,
              },
        })),
        nextCursor,
        hasMore: !!nextCursor,
      };
    }),

  // Get tips sent by fan
  getSent: protectedProcedure
    .input(paginationSchema)
    .query(async ({ ctx, input }) => {
      return ctx.prisma.tip.findMany({
        where: { senderId: ctx.user.id },
        take: input.limit,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          creatorProfile: {
            select: { displayName: true, slug: true, avatarKey: true },
          },
        },
      });
    }),
});
