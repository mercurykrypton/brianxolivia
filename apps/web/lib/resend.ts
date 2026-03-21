import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  console.warn("Missing RESEND_API_KEY - emails will not be sent");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "brianXolivia <noreply@brianxolivia.com>";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Email types
export type EmailType =
  | "welcome"
  | "new_subscriber"
  | "new_tip"
  | "new_message"
  | "subscription_canceled"
  | "payout_sent"
  | "content_request"
  | "verification_approved"
  | "password_reset";

// Send welcome email to new user
export async function sendWelcomeEmail(params: {
  to: string;
  displayName: string;
  role: "FAN" | "CREATOR";
}): Promise<void> {
  const { WelcomeEmail } = await import("../emails/WelcomeEmail");
  const { createElement } = await import("react");

  await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `Welcome to brianXolivia, ${params.displayName}! 🎉`,
    react: createElement(WelcomeEmail, {
      displayName: params.displayName,
      role: params.role,
      appUrl: APP_URL,
    }),
  });
}

// Send new subscriber notification to creator
export async function sendNewSubscriberEmail(params: {
  to: string;
  creatorName: string;
  subscriberName: string;
  tierName: string;
  amount: number;
}): Promise<void> {
  await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `New subscriber: ${params.subscriberName} joined ${params.tierName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF1493;">New Subscriber! 🎉</h1>
        <p>Hi ${params.creatorName},</p>
        <p><strong>${params.subscriberName}</strong> just subscribed to your <strong>${params.tierName}</strong> tier for <strong>$${params.amount}/month</strong>.</p>
        <a href="${APP_URL}/dashboard" style="background: linear-gradient(135deg, #FF1493, #9B59B6); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">View Dashboard</a>
        <p style="color: #666; margin-top: 24px; font-size: 12px;">brianXolivia</p>
      </div>
    `,
  });
}

// Send tip notification to creator
export async function sendNewTipEmail(params: {
  to: string;
  creatorName: string;
  senderName: string;
  amount: number;
  message?: string;
}): Promise<void> {
  await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `You received a $${params.amount} tip! 💸`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF1493;">You got a tip! 💸</h1>
        <p>Hi ${params.creatorName},</p>
        <p><strong>${params.senderName}</strong> sent you a <strong>$${params.amount}</strong> tip!</p>
        ${params.message ? `<blockquote style="border-left: 4px solid #FF1493; padding-left: 16px; color: #444;">"${params.message}"</blockquote>` : ""}
        <a href="${APP_URL}/earnings" style="background: linear-gradient(135deg, #FF1493, #9B59B6); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">View Earnings</a>
        <p style="color: #666; margin-top: 24px; font-size: 12px;">brianXolivia</p>
      </div>
    `,
  });
}

// Send payout notification
export async function sendPayoutEmail(params: {
  to: string;
  creatorName: string;
  amount: number;
  estimatedArrival: string;
}): Promise<void> {
  await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `Payout of $${params.amount} is on its way! 💰`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF1493;">Payout Sent! 💰</h1>
        <p>Hi ${params.creatorName},</p>
        <p>Your payout of <strong>$${params.amount}</strong> has been sent!</p>
        <p>Estimated arrival: <strong>${params.estimatedArrival}</strong></p>
        <a href="${APP_URL}/earnings" style="background: linear-gradient(135deg, #FF1493, #9B59B6); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">View Earnings</a>
        <p style="color: #666; margin-top: 24px; font-size: 12px;">brianXolivia</p>
      </div>
    `,
  });
}

// Send subscription canceled notification
export async function sendSubscriptionCanceledEmail(params: {
  to: string;
  displayName: string;
  creatorName: string;
  endDate: string;
}): Promise<void> {
  await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `Your ${params.creatorName} subscription has been canceled`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #9B59B6;">Subscription Canceled</h1>
        <p>Hi ${params.displayName},</p>
        <p>Your subscription to <strong>${params.creatorName}</strong> has been canceled.</p>
        <p>You'll continue to have access until <strong>${params.endDate}</strong>.</p>
        <a href="${APP_URL}/explore" style="background: linear-gradient(135deg, #FF1493, #9B59B6); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">Explore Creators</a>
        <p style="color: #666; margin-top: 24px; font-size: 12px;">brianXolivia</p>
      </div>
    `,
  });
}
