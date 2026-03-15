import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@workspace/db";
import { createAblyTokenRequest } from "@/lib/ably";

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const tokenRequest = await createAblyTokenRequest(user.id);
    return NextResponse.json(tokenRequest);
  } catch (err) {
    console.error("Ably token error:", err);
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }
}
