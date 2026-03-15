import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { TRPCContext } from "./context";

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Protected procedure - requires auth
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.auth.userId || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Creator procedure - requires creator role
export const creatorProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.auth.userId || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in",
    });
  }

  if (ctx.user.role !== "CREATOR" && ctx.user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a creator to perform this action",
    });
  }

  if (!ctx.user.creatorProfile) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Creator profile not found",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      creatorProfile: ctx.user.creatorProfile,
    },
  });
});

// Admin procedure
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.auth.userId || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in",
    });
  }

  if (ctx.user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const createCallerFactory = t.createCallerFactory;
export { t };
