import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@workspace/db";
import { stripe, constructWebhookEvent } from "@/lib/stripe";
import { publishNotification } from "@/lib/ably";
import { sendSubscriptionCanceledEmail, sendPayoutEmail } from "@/lib/resend";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });
  }

  let event;
  try {
    event = constructWebhookEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const stripeSubId = subscription.id;
        const status = mapSubscriptionStatus(subscription.status);

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: stripeSubId },
          data: {
            status,
            currentPeriodStart: subscription.current_period_start
              ? new Date(subscription.current_period_start * 1000)
              : undefined,
            currentPeriodEnd: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : undefined,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const stripeSubId = subscription.id;

        const sub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: stripeSubId },
          include: {
            tier: {
              include: {
                creatorProfile: {
                  select: { displayName: true, id: true },
                },
              },
            },
            subscriber: {
              select: {
                id: true,
                email: true,
                fanProfile: { select: { displayName: true } },
              },
            },
          },
        });

        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "CANCELED", canceledAt: new Date() },
          });

          await prisma.creatorProfile.update({
            where: { id: sub.tier.creatorProfile.id },
            data: { subscriberCount: { decrement: 1 } },
          });

          // Notify fan
          await sendSubscriptionCanceledEmail({
            to: sub.subscriber.email,
            displayName: sub.subscriber.fanProfile?.displayName ?? "Fan",
            creatorName: sub.tier.creatorProfile.displayName,
            endDate: sub.currentPeriodEnd?.toLocaleDateString() ?? "now",
          }).catch(console.error);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        const stripeSubId = invoice.subscription;

        if (stripeSubId) {
          const sub = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: stripeSubId },
            include: {
              tier: {
                include: {
                  creatorProfile: { select: { id: true, userId: true } },
                },
              },
              subscriber: {
                select: { id: true },
              },
            },
          });

          if (sub) {
            const amountPaid = invoice.amount_paid / 100;
            const platformFee = amountPaid * 0.2;
            const netAmount = amountPaid - platformFee;

            await prisma.transaction.create({
              data: {
                type: "SUBSCRIPTION",
                userId: sub.subscriberId,
                creatorProfileId: sub.tier.creatorProfile.id,
                amount: amountPaid,
                platformFee,
                netAmount,
                stripeId: invoice.id,
                description: `Subscription renewal`,
              },
            });

            await prisma.creatorProfile.update({
              where: { id: sub.tier.creatorProfile.id },
              data: { totalEarnings: { increment: netAmount } },
            });

            // Notify creator
            const notification = await prisma.notification.create({
              data: {
                userId: sub.tier.creatorProfile.userId,
                type: "SUBSCRIPTION_RENEWED",
                title: "Subscription renewed",
                body: `A subscriber renewed their subscription for $${amountPaid}`,
                data: { subscriptionId: sub.id, amount: amountPaid },
              },
            });

            await publishNotification(sub.tier.creatorProfile.userId, {
              id: notification.id,
              type: notification.type,
              title: notification.title,
              body: notification.body,
              data: notification.data,
            }).catch(console.error);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const stripeSubId = invoice.subscription;

        if (stripeSubId) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: stripeSubId },
            data: { status: "PAST_DUE" },
          });
        }
        break;
      }

      case "payout.paid": {
        const payout = event.data.object as any;

        // Find creator by stripe account
        const creator = await prisma.creatorProfile.findFirst({
          where: { stripeAccountId: event.account as string },
          include: {
            user: { select: { id: true, email: true } },
          },
        });

        if (creator) {
          const amount = payout.amount / 100;

          await prisma.payout.upsert({
            where: { stripePayoutId: payout.id },
            create: {
              creatorProfileId: creator.id,
              stripePayoutId: payout.id,
              amount,
              status: "PAID",
              arrivalDate: payout.arrival_date
                ? new Date(payout.arrival_date * 1000)
                : new Date(),
            },
            update: { status: "PAID" },
          });

          const notification = await prisma.notification.create({
            data: {
              userId: creator.user.id,
              type: "PAYOUT_SENT",
              title: "Payout sent!",
              body: `$${amount} has been sent to your bank account`,
              data: { payoutId: payout.id, amount },
            },
          });

          await publishNotification(creator.user.id, {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            data: notification.data,
          }).catch(console.error);

          await sendPayoutEmail({
            to: creator.user.email,
            creatorName: creator.displayName,
            amount,
            estimatedArrival: payout.arrival_date
              ? new Date(payout.arrival_date * 1000).toLocaleDateString()
              : "2-5 business days",
          }).catch(console.error);
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as any;

        if (account.charges_enabled && account.payouts_enabled) {
          await prisma.creatorProfile.updateMany({
            where: { stripeAccountId: account.id },
            data: { stripeOnboardingComplete: true },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

function mapSubscriptionStatus(
  stripeStatus: string
): "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING" | "INCOMPLETE" | "PAUSED" {
  const map: Record<string, any> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    trialing: "TRIALING",
    incomplete: "INCOMPLETE",
    paused: "PAUSED",
    unpaid: "PAST_DUE",
  };
  return map[stripeStatus] ?? "ACTIVE";
}
