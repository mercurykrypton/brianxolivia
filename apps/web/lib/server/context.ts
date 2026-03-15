import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@workspace/db";
import type { NextRequest } from "next/server";

export interface Context {
  auth: {
    userId: string | null;
    sessionId: string | null;
  };
  user?: {
    id: string;
    clerkId: string;
    email: string;
    role: "FAN" | "CREATOR" | "ADMIN";
    creatorProfile?: {
      id: string;
      slug: string;
      displayName: string;
      stripeAccountId: string | null;
    } | null;
  } | null;
  prisma: typeof prisma;
  req?: NextRequest;
}

export async function createTRPCContext(opts: {
  req?: NextRequest;
}): Promise<Context> {
  const { userId, sessionId } = await auth();

  let user: Context["user"] = null;

  if (userId) {
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        role: true,
        creatorProfile: {
          select: {
            id: true,
            slug: true,
            displayName: true,
            stripeAccountId: true,
          },
        },
      },
    });

    if (!dbUser) {
      // Auto-create user record if doesn't exist (race condition from webhook)
      const clerkUser = await currentUser();
      if (clerkUser) {
        const primaryEmail =
          clerkUser.emailAddresses.find(
            (e) => e.id === clerkUser.primaryEmailAddressId
          )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

        if (primaryEmail) {
          const newUser = await prisma.user.upsert({
            where: { clerkId: userId },
            create: {
              clerkId: userId,
              email: primaryEmail,
              role: "FAN",
            },
            update: {},
            select: {
              id: true,
              clerkId: true,
              email: true,
              role: true,
              creatorProfile: {
                select: {
                  id: true,
                  slug: true,
                  displayName: true,
                  stripeAccountId: true,
                },
              },
            },
          });
          user = newUser as Context["user"];
        }
      }
    } else {
      user = dbUser as Context["user"];
    }
  }

  return {
    auth: {
      userId,
      sessionId,
    },
    user,
    prisma,
    req: opts.req,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
