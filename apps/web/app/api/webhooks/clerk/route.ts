import { Webhook } from "svix";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@workspace/db";
import { sendWelcomeEmail } from "@/lib/resend";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing CLERK_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  const body = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  let event: any;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = event;

  try {
    switch (type) {
      case "user.created": {
        const primaryEmail = data.email_addresses?.find(
          (e: any) => e.id === data.primary_email_address_id
        )?.email_address;

        if (!primaryEmail) {
          console.warn("No primary email for user:", data.id);
          break;
        }

        // Create user in DB
        const user = await prisma.user.upsert({
          where: { clerkId: data.id },
          create: {
            clerkId: data.id,
            email: primaryEmail,
            role: "FAN",
          },
          update: {
            email: primaryEmail,
          },
        });

        // Create default fan profile
        const displayName =
          data.first_name
            ? `${data.first_name}${data.last_name ? " " + data.last_name : ""}`
            : primaryEmail.split("@")[0] ?? "Fan";

        await prisma.fanProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            displayName,
          },
          update: {},
        });

        // Send welcome email
        await sendWelcomeEmail({
          to: primaryEmail,
          displayName,
          role: "FAN",
        }).catch(console.error);

        break;
      }

      case "user.updated": {
        const primaryEmail = data.email_addresses?.find(
          (e: any) => e.id === data.primary_email_address_id
        )?.email_address;

        if (primaryEmail) {
          await prisma.user.updateMany({
            where: { clerkId: data.id },
            data: { email: primaryEmail },
          });
        }
        break;
      }

      case "user.deleted": {
        // Soft delete - set deletedAt
        await prisma.user.updateMany({
          where: { clerkId: data.id },
          data: { deletedAt: new Date() },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Clerk webhook error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
