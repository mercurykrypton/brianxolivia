import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "../trpc";
import { sendMessageSchema, paginationSchema } from "@workspace/schemas";
import { getPublicUrl, createPresignedDownloadUrl } from "../../r2";
import { publishMessage, publishReadReceipt, publishNotification } from "../../ably";

export const messagesRouter = createTRPCRouter({
  // Get all conversations for current user
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    // Determine if user is creator or fan context
    const isCreator = ctx.user.role === "CREATOR";

    let conversations;

    if (isCreator && ctx.user.creatorProfile) {
      conversations = await ctx.prisma.conversation.findMany({
        where: { creatorProfileId: ctx.user.creatorProfile.id },
        orderBy: { lastMessageAt: "desc" },
        include: {
          fan: {
            select: {
              id: true,
              fanProfile: { select: { displayName: true, avatarKey: true } },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              body: true,
              isPPV: true,
              createdAt: true,
              isRead: true,
              senderId: true,
            },
          },
          _count: {
            select: {
              messages: { where: { isRead: false, senderId: { not: ctx.user.id } } },
            },
          },
        },
      });

      return conversations.map((c) => ({
        id: c.id,
        otherParty: {
          id: c.fan.id,
          displayName: c.fan.fanProfile?.displayName ?? "Anonymous",
          avatarUrl: c.fan.fanProfile?.avatarKey
            ? getPublicUrl(c.fan.fanProfile.avatarKey)
            : null,
          type: "fan" as const,
        },
        lastMessage: c.messages[0] ?? null,
        unreadCount: c._count.messages,
        isUnlocked: c.isUnlocked,
        dmPrice: c.dmPrice,
        lastMessageAt: c.lastMessageAt,
      }));
    } else {
      conversations = await ctx.prisma.conversation.findMany({
        where: { fanUserId: ctx.user.id },
        orderBy: { lastMessageAt: "desc" },
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
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              body: true,
              isPPV: true,
              createdAt: true,
              isRead: true,
              senderId: true,
            },
          },
          _count: {
            select: {
              messages: { where: { isRead: false, senderId: { not: ctx.user.id } } },
            },
          },
        },
      });

      return conversations.map((c) => ({
        id: c.id,
        otherParty: {
          id: c.creatorProfile.id,
          displayName: c.creatorProfile.displayName,
          avatarUrl: c.creatorProfile.avatarKey
            ? getPublicUrl(c.creatorProfile.avatarKey)
            : null,
          slug: c.creatorProfile.slug,
          isVerified: c.creatorProfile.isVerified,
          type: "creator" as const,
        },
        lastMessage: c.messages[0] ?? null,
        unreadCount: c._count.messages,
        isUnlocked: c.isUnlocked,
        dmPrice: c.dmPrice,
        lastMessageAt: c.lastMessageAt,
      }));
    }
  }),

  // Get or create conversation between fan and creator
  getOrCreateConversation: protectedProcedure
    .input(z.object({ creatorProfileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const creator = await ctx.prisma.creatorProfile.findUnique({
        where: { id: input.creatorProfileId },
        select: {
          id: true,
          displayName: true,
          subscriptionTiers: {
            where: { isActive: true, dmAccess: true },
            select: { id: true },
          },
        },
      });

      if (!creator) throw new TRPCError({ code: "NOT_FOUND" });

      // Check if user is subscribed with DM access
      let isUnlocked = false;
      const dmTierIds = creator.subscriptionTiers.map((t) => t.id);

      if (dmTierIds.length > 0) {
        const sub = await ctx.prisma.subscription.findFirst({
          where: {
            subscriberId: ctx.user.id,
            tierId: { in: dmTierIds },
            status: { in: ["ACTIVE", "TRIALING"] },
          },
        });
        isUnlocked = !!sub;
      } else {
        // Creator has no DM-gated tiers, DMs are free/open
        isUnlocked = true;
      }

      const conversation = await ctx.prisma.conversation.upsert({
        where: {
          creatorProfileId_fanUserId: {
            creatorProfileId: input.creatorProfileId,
            fanUserId: ctx.user.id,
          },
        },
        create: {
          creatorProfileId: input.creatorProfileId,
          fanUserId: ctx.user.id,
          isUnlocked,
        },
        update: {},
        select: {
          id: true,
          isUnlocked: true,
          dmPrice: true,
          creatorProfile: {
            select: { displayName: true, avatarKey: true, isVerified: true },
          },
        },
      });

      return {
        ...conversation,
        creatorProfile: {
          ...conversation.creatorProfile,
          avatarUrl: conversation.creatorProfile.avatarKey
            ? getPublicUrl(conversation.creatorProfile.avatarKey)
            : null,
        },
      };
    }),

  // Get messages in a conversation
  getMessages: protectedProcedure
    .input(
      paginationSchema.extend({
        conversationId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify user has access to this conversation
      const conversation = await ctx.prisma.conversation.findUnique({
        where: { id: input.conversationId },
        select: {
          id: true,
          fanUserId: true,
          creatorProfile: { select: { userId: true } },
        },
      });

      if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });

      const isParticipant =
        conversation.fanUserId === ctx.user.id ||
        conversation.creatorProfile.userId === ctx.user.id;

      if (!isParticipant) throw new TRPCError({ code: "FORBIDDEN" });

      const messages = await ctx.prisma.message.findMany({
        where: { conversationId: input.conversationId },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          sender: {
            select: {
              id: true,
              fanProfile: { select: { displayName: true, avatarKey: true } },
              creatorProfile: {
                select: { displayName: true, avatarKey: true },
              },
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (messages.length > input.limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      // Mark messages as read
      const unreadIds = messages
        .filter((m) => !m.isRead && m.senderId !== ctx.user.id)
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        await ctx.prisma.message.updateMany({
          where: { id: { in: unreadIds } },
          data: { isRead: true, readAt: new Date() },
        });

        await publishReadReceipt(
          input.conversationId,
          unreadIds,
          ctx.user.id
        ).catch(console.error);
      }

      return {
        items: messages.reverse().map((m) => {
          const senderDisplay =
            m.sender.creatorProfile?.displayName ??
            m.sender.fanProfile?.displayName ??
            "Unknown";
          const avatarKey =
            m.sender.creatorProfile?.avatarKey ?? m.sender.fanProfile?.avatarKey;

          // For PPV messages not unlocked by current user
          const isPPVLocked =
            m.isPPV && !m.ppvUnlocked && m.senderId !== ctx.user.id;

          return {
            id: m.id,
            conversationId: m.conversationId,
            senderId: m.senderId,
            isOwnMessage: m.senderId === ctx.user.id,
            body: isPPVLocked ? null : m.body,
            mediaUrl: null, // resolved separately via presign
            mediaKey: isPPVLocked ? null : m.mediaKey,
            isPPV: m.isPPV,
            ppvPrice: m.ppvPrice,
            ppvUnlocked: m.ppvUnlocked,
            isRead: m.isRead,
            tipAmount: m.tipAmount,
            createdAt: m.createdAt,
            sender: {
              id: m.sender.id,
              displayName: senderDisplay,
              avatarUrl: avatarKey ? getPublicUrl(avatarKey) : null,
            },
          };
        }),
        nextCursor,
        hasMore: !!nextCursor,
      };
    }),

  // Send a message
  sendMessage: protectedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify conversation access
      const conversation = await ctx.prisma.conversation.findUnique({
        where: { id: input.conversationId },
        include: {
          creatorProfile: {
            select: {
              userId: true,
              id: true,
              displayName: true,
              stripeAccountId: true,
            },
          },
          fan: { select: { id: true, fanProfile: { select: { displayName: true } } } },
        },
      });

      if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });

      const isCreator =
        conversation.creatorProfile.userId === ctx.user.id;
      const isFan = conversation.fanUserId === ctx.user.id;

      if (!isCreator && !isFan) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (!conversation.isUnlocked && isFan) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "DMs are locked. Subscribe with DM access or pay to unlock.",
        });
      }

      // Create message
      const message = await ctx.prisma.message.create({
        data: {
          conversationId: input.conversationId,
          senderId: ctx.user.id,
          body: input.body,
          mediaKey: input.mediaKey,
          isPPV: input.isPPV,
          ppvPrice: input.ppvPrice,
          tipAmount: input.tipAmount,
        },
      });

      // Update conversation last message time
      await ctx.prisma.conversation.update({
        where: { id: input.conversationId },
        data: { lastMessageAt: new Date() },
      });

      // Publish to Ably
      await publishMessage(input.conversationId, {
        id: message.id,
        senderId: message.senderId,
        body: input.isPPV ? null : message.body,
        isPPV: message.isPPV,
        ppvPrice: message.ppvPrice,
        createdAt: message.createdAt,
      }).catch(console.error);

      // Notify recipient
      const recipientId = isCreator
        ? conversation.fanUserId
        : conversation.creatorProfile.userId;

      const senderName = isCreator
        ? conversation.creatorProfile.displayName
        : conversation.fan.fanProfile?.displayName ?? "A fan";

      const notification = await ctx.prisma.notification.create({
        data: {
          userId: recipientId,
          type: "NEW_MESSAGE",
          title: `New message from ${senderName}`,
          body: input.isPPV
            ? "PPV message received"
            : input.body?.slice(0, 100) ?? "Media message",
          data: { conversationId: input.conversationId, messageId: message.id },
        },
      });

      await publishNotification(recipientId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data,
      }).catch(console.error);

      return message;
    }),

  // Unlock PPV message
  unlockPPVMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        paymentMethodId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.prisma.message.findUnique({
        where: { id: input.messageId },
        include: {
          conversation: {
            include: {
              creatorProfile: {
                select: { stripeAccountId: true, id: true },
              },
            },
          },
        },
      });

      if (!message || !message.isPPV || !message.ppvPrice) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (message.ppvUnlocked) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already unlocked" });
      }

      if (message.conversation.fanUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const { getOrCreateStripeCustomer, createPaymentIntent } = await import(
        "../../stripe"
      );

      const customerId = await getOrCreateStripeCustomer({
        userId: ctx.user.id,
        email: ctx.user.email,
      });

      if (!message.conversation.creatorProfile.stripeAccountId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Creator has not set up payments" });
      }

      const paymentIntent = await createPaymentIntent({
        amount: message.ppvPrice,
        customerId,
        paymentMethodId: input.paymentMethodId,
        creatorStripeAccountId:
          message.conversation.creatorProfile.stripeAccountId,
        description: "Brivia: PPV message unlock",
        metadata: {
          messageId: message.id,
          buyerId: ctx.user.id,
          creatorProfileId: message.conversation.creatorProfile.id,
        },
        confirm: true,
      });

      await ctx.prisma.message.update({
        where: { id: input.messageId },
        data: {
          ppvUnlocked: true,
          ppvUnlockedAt: new Date(),
        },
      });

      const platformFee = message.ppvPrice * 0.2;
      await ctx.prisma.transaction.create({
        data: {
          type: "PPV_MESSAGE",
          userId: ctx.user.id,
          creatorProfileId: message.conversation.creatorProfile.id,
          amount: message.ppvPrice,
          platformFee,
          netAmount: message.ppvPrice - platformFee,
          stripeId: paymentIntent.id,
          description: "PPV Message",
        },
      });

      // Get media URL for unlocked message
      let mediaUrl: string | null = null;
      if (message.mediaKey) {
        mediaUrl = await createPresignedDownloadUrl(message.mediaKey);
      }

      return { success: true, mediaUrl };
    }),

  // Unlock DM conversation (pay-to-message)
  unlockConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        paymentMethodId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conversation = await ctx.prisma.conversation.findUnique({
        where: { id: input.conversationId },
        include: {
          creatorProfile: {
            select: { id: true, stripeAccountId: true, dmPrice: true },
          },
        },
      });

      if (!conversation || conversation.fanUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (conversation.isUnlocked) {
        return { success: true };
      }

      const dmPrice = conversation.dmPrice ?? (conversation.creatorProfile as any).dmPrice;

      if (!dmPrice) {
        // Free DMs - just unlock
        await ctx.prisma.conversation.update({
          where: { id: input.conversationId },
          data: { isUnlocked: true },
        });
        return { success: true };
      }

      if (!conversation.creatorProfile.stripeAccountId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Creator has not set up payments" });
      }

      const { getOrCreateStripeCustomer, createPaymentIntent } = await import(
        "../../stripe"
      );

      const customerId = await getOrCreateStripeCustomer({
        userId: ctx.user.id,
        email: ctx.user.email,
      });

      const paymentIntent = await createPaymentIntent({
        amount: dmPrice,
        customerId,
        paymentMethodId: input.paymentMethodId,
        creatorStripeAccountId: conversation.creatorProfile.stripeAccountId,
        description: "Brivia: DM unlock",
        confirm: true,
      });

      await ctx.prisma.conversation.update({
        where: { id: input.conversationId },
        data: { isUnlocked: true },
      });

      const platformFee = dmPrice * 0.2;
      await ctx.prisma.transaction.create({
        data: {
          type: "PPV_MESSAGE",
          userId: ctx.user.id,
          creatorProfileId: conversation.creatorProfile.id,
          amount: dmPrice,
          platformFee,
          netAmount: dmPrice - platformFee,
          stripeId: paymentIntent.id,
          description: "DM Unlock",
        },
      });

      return { success: true };
    }),

  // Get Ably token for messaging
  getAblyToken: protectedProcedure.mutation(async ({ ctx }) => {
    const { createAblyTokenRequest } = await import("../../ably");
    const tokenRequest = await createAblyTokenRequest(ctx.user.id);
    return tokenRequest;
  }),
});
