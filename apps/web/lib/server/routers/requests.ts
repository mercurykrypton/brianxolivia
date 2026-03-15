import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  creatorProcedure,
} from "../trpc";
import {
  createContentRequestSchema,
  updateContentRequestSchema,
  paginationSchema,
} from "@workspace/schemas";
import { getOrCreateStripeCustomer, createPaymentIntent } from "../../stripe";
import { publishNotification } from "../../ably";
import { getPublicUrl } from "../../r2";

export const requestsRouter = createTRPCRouter({
  // Fan creates a content request
  create: protectedProcedure
    .input(createContentRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const creator = await ctx.prisma.creatorProfile.findUnique({
        where: { id: input.creatorProfileId },
        include: {
          user: { select: { id: true } },
        },
      });

      if (!creator) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (!creator.stripeAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Creator has not set up payments",
        });
      }

      // Charge the fan upfront (held in escrow-like fashion)
      const customerId = await getOrCreateStripeCustomer({
        userId: ctx.user.id,
        email: ctx.user.email,
      });

      const platformFee = input.budget * 0.2;
      const netAmount = input.budget - platformFee;

      const paymentIntent = await createPaymentIntent({
        amount: input.budget,
        customerId,
        paymentMethodId: input.paymentMethodId,
        creatorStripeAccountId: creator.stripeAccountId,
        description: `Content request: ${input.title}`,
        metadata: {
          requesterId: ctx.user.id,
          creatorProfileId: creator.id,
          type: "content_request",
        },
        confirm: true,
      });

      const request = await ctx.prisma.contentRequest.create({
        data: {
          requestedById: ctx.user.id,
          creatorProfileId: input.creatorProfileId,
          title: input.title,
          description: input.description,
          budget: input.budget,
          stripePaymentId: paymentIntent.id,
        },
      });

      // Notify creator
      const fanProfile = await ctx.prisma.fanProfile.findUnique({
        where: { userId: ctx.user.id },
        select: { displayName: true },
      });

      const notification = await ctx.prisma.notification.create({
        data: {
          userId: creator.user.id,
          type: "CONTENT_REQUEST",
          title: "New content request!",
          body: `${fanProfile?.displayName ?? "A fan"} requested: "${input.title}" with a $${input.budget} budget`,
          data: { requestId: request.id },
        },
      });

      await publishNotification(creator.user.id, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data,
      }).catch(console.error);

      // Record transaction
      await ctx.prisma.transaction.create({
        data: {
          type: "CONTENT_REQUEST",
          userId: ctx.user.id,
          creatorProfileId: creator.id,
          amount: input.budget,
          platformFee,
          netAmount,
          stripeId: paymentIntent.id,
          description: `Content request: ${input.title}`,
        },
      });

      return { success: true, requestId: request.id };
    }),

  // Creator updates request status
  updateStatus: creatorProcedure
    .input(updateContentRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.prisma.contentRequest.findUnique({
        where: { id: input.id },
        include: {
          requestedBy: {
            select: {
              id: true,
              fanProfile: { select: { displayName: true } },
            },
          },
        },
      });

      if (
        !request ||
        request.creatorProfileId !== ctx.creatorProfile.id
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const updated = await ctx.prisma.contentRequest.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.rejectionReason && {
            rejectionReason: input.rejectionReason,
          }),
          ...(input.deliveredPostId && {
            deliveredPostId: input.deliveredPostId,
          }),
        },
      });

      // Notify requester
      const statusMessages: Record<string, string> = {
        ACCEPTED: `Your request "${request.title}" has been accepted!`,
        IN_PROGRESS: `Your request "${request.title}" is now in progress!`,
        DELIVERED: `Your request "${request.title}" has been delivered!`,
        REJECTED: `Your request "${request.title}" was declined. ${input.rejectionReason ?? ""}`,
      };

      if (statusMessages[input.status]) {
        const notification = await ctx.prisma.notification.create({
          data: {
            userId: request.requestedById,
            type: "CONTENT_REQUEST",
            title: "Content request update",
            body: statusMessages[input.status]!,
            data: { requestId: request.id, status: input.status },
          },
        });

        await publishNotification(request.requestedById, {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data,
        }).catch(console.error);
      }

      return updated;
    }),

  // Get requests for creator
  getCreatorRequests: creatorProcedure
    .input(
      paginationSchema.extend({
        status: z
          .enum(["PENDING", "ACCEPTED", "IN_PROGRESS", "DELIVERED", "REJECTED"])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const requests = await ctx.prisma.contentRequest.findMany({
        where: {
          creatorProfileId: ctx.creatorProfile.id,
          ...(input.status && { status: input.status }),
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          requestedBy: {
            select: {
              id: true,
              fanProfile: { select: { displayName: true, avatarKey: true } },
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (requests.length > input.limit) {
        const nextItem = requests.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: requests.map((r) => ({
          ...r,
          requesterName:
            r.requestedBy.fanProfile?.displayName ?? "Anonymous",
          requesterAvatarUrl: r.requestedBy.fanProfile?.avatarKey
            ? getPublicUrl(r.requestedBy.fanProfile.avatarKey)
            : null,
        })),
        nextCursor,
        hasMore: !!nextCursor,
      };
    }),

  // Get requests sent by fan
  getMyRequests: protectedProcedure
    .input(paginationSchema)
    .query(async ({ ctx, input }) => {
      const requests = await ctx.prisma.contentRequest.findMany({
        where: { requestedById: ctx.user.id },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          creatorProfile: {
            select: { displayName: true, slug: true, avatarKey: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (requests.length > input.limit) {
        const nextItem = requests.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: requests.map((r) => ({
          ...r,
          creatorProfile: {
            ...r.creatorProfile,
            avatarUrl: r.creatorProfile.avatarKey
              ? getPublicUrl(r.creatorProfile.avatarKey)
              : null,
          },
        })),
        nextCursor,
        hasMore: !!nextCursor,
      };
    }),
});
