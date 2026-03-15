import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../trpc";
import {
  onboardingCreatorSchema,
  onboardingFanSchema,
} from "@workspace/schemas";

export const authRouter = createTRPCRouter({
  // Get current user profile
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      include: {
        creatorProfile: {
          include: {
            subscriptionTiers: {
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
            },
            verification: {
              select: { status: true },
            },
          },
        },
        fanProfile: true,
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return user;
  }),

  // Onboarding for fans
  onboardFan: protectedProcedure
    .input(onboardingFanSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "FAN" && ctx.user.role !== "CREATOR") {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      // Create or update fan profile
      await ctx.prisma.fanProfile.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          displayName: input.displayName,
        },
        update: {
          displayName: input.displayName,
        },
      });

      return { success: true };
    }),

  // Onboarding for creators
  onboardCreator: protectedProcedure
    .input(onboardingCreatorSchema)
    .mutation(async ({ ctx, input }) => {
      // Check slug is available
      const existing = await ctx.prisma.creatorProfile.findUnique({
        where: { slug: input.slug },
      });

      if (existing && existing.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This URL is already taken. Please choose another.",
        });
      }

      // Update user role to CREATOR
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { role: "CREATOR" },
      });

      // Create or update creator profile
      const creatorProfile = await ctx.prisma.creatorProfile.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          displayName: input.displayName,
          slug: input.slug,
          bio: input.bio,
          tags: input.tags ?? [],
        },
        update: {
          displayName: input.displayName,
          slug: input.slug,
          bio: input.bio,
          tags: input.tags ?? [],
        },
      });

      // Also ensure fan profile exists
      await ctx.prisma.fanProfile.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          displayName: input.displayName,
        },
        update: {},
      });

      return { success: true, slug: creatorProfile.slug };
    }),

  // Check if slug is available
  checkSlug: publicProcedure
    .input(z.object({ slug: z.string().min(3).max(30) }))
    .query(async ({ ctx, input }) => {
      const existing = await ctx.prisma.creatorProfile.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      });
      return { available: !existing };
    }),

  // Switch role (FAN -> apply to become CREATOR)
  applyCreator: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role === "CREATOR") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Already a creator",
      });
    }
    // In real app, this would create a verification request
    // For now, just update role
    await ctx.prisma.user.update({
      where: { id: ctx.user.id },
      data: { role: "CREATOR" },
    });
    return { success: true };
  }),
});
