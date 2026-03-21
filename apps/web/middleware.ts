import { NextRequest, NextResponse } from "next/server";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const hasClerk =
  clerkKey.startsWith("pk_test_") &&
  clerkKey.length > 20 &&
  !clerkKey.endsWith("...");

// Lazy-load Clerk middleware only when valid keys are present
let _clerkMiddleware: ((req: NextRequest) => Promise<NextResponse>) | null = null;

async function getClerkMiddleware() {
  if (!_clerkMiddleware) {
    const { clerkMiddleware, createRouteMatcher } = await import(
      "@clerk/nextjs/server"
    );

    const isPublicRoute = createRouteMatcher([
      "/",
      "/sign-in(.*)",
      "/sign-up(.*)",
      "/c/(.*)",
      "/api/webhooks/(.*)",
      "/api/cron/(.*)",
      "/api/internal/(.*)",
      "/api/trpc/(.*)",
      "/_next(.*)",
      "/favicon.ico",
    ]);

    _clerkMiddleware = clerkMiddleware(async (auth, request) => {
      if (!isPublicRoute(request)) {
        await auth.protect();
      }
      return NextResponse.next();
    }) as unknown as (req: NextRequest) => Promise<NextResponse>;
  }
  return _clerkMiddleware;
}

export async function middleware(request: NextRequest) {
  if (!hasClerk) {
    return NextResponse.next();
  }
  const handler = await getClerkMiddleware();
  return handler(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
