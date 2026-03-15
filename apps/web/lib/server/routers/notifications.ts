import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "../trpc";
import { paginationSchema } from "@workspace/schemas";

export const notificationsRouter = createTRPCRouter({
  // Get notifications for current user
  getAll: protectedProcedure
    .input(paginationSchema.extend({ unreadOnly: z.boolean().default(false) }))
    .query(async ({ ctx, input }) => {
      const notifications = await ctx.prisma.notification.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.unreadOnly && { isRead: false }),
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: string | undefined;
      if (notifications.length > input.limit) {
        const nextItem = notifications.pop();
        nextCursor = nextItem?.id;
      }

      return { items: notifications, nextCursor, hasMore: !!nextCursor };
    }),

  // Get unread count
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.prisma.notification.count({
      where: { userId: ctx.user.id, isRead: false },
    });
    return { count };
  }),

  // Mark notifications as read
  markRead: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()).optional(), // if empty, mark all as read
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.notification.updateMany({
        where: {
          userId: ctx.user.id,
          ...(input.ids && input.ids.length > 0 ? { id: { in: input.ids } } : {}),
        },
        data: { isRead: true, readAt: new Date() },
      });
      return { success: true };
    }),

  // Delete a notification
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.notification.deleteMany({
        where: { id: input.id, userId: ctx.user.id },
      });
      return { success: true };
    }),

  // Get Ably token for notifications
  getAblyToken: protectedProcedure.mutation(async ({ ctx }) => {
    const { createAblyTokenRequest } = await import("../../ably");
    return createAblyTokenRequest(ctx.user.id);
  }),
});
