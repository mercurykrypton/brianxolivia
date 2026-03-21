import Stripe from "stripe";

// Lazy singleton — avoids build-time throw when env var isn't available during static analysis
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return _stripe;
}

// Keep named export for backwards compat — resolved at call time
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string, unknown>)[prop as string];
  },
});

export const PLATFORM_FEE_PERCENT =
  parseFloat(process.env.PLATFORM_FEE_PERCENT ?? "20") / 100;

// Get or create a Stripe customer for a user
export async function getOrCreateStripeCustomer(params: {
  userId: string;
  email: string;
  name?: string;
}): Promise<string> {
  const { prisma } = await import("@workspace/db");

  // Check if user has existing payment methods with customer ID
  const existingPM = await prisma.paymentMethod.findFirst({
    where: { userId: params.userId },
    select: { stripeCustomerId: true },
  });

  if (existingPM?.stripeCustomerId) {
    return existingPM.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: { userId: params.userId },
  });

  return customer.id;
}

// Create Stripe Connect account for creator
export async function createConnectAccount(params: {
  email: string;
  creatorProfileId: string;
  countryCode?: string;
}): Promise<{ accountId: string; onboardingUrl: string }> {
  const account = await stripe.accounts.create({
    type: "express",
    email: params.email,
    country: params.countryCode ?? "US",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { creatorProfileId: params.creatorProfileId },
    settings: {
      payouts: {
        schedule: {
          interval: "weekly",
          weekly_anchor: "friday",
        },
      },
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${appUrl}/earnings?reauth=true`,
    return_url: `${appUrl}/earnings?connected=true`,
    type: "account_onboarding",
  });

  return { accountId: account.id, onboardingUrl: accountLink.url };
}

// Create payment intent for one-time payments (tips, PPV, requests)
export async function createPaymentIntent(params: {
  amount: number; // in dollars
  currency?: string;
  customerId: string;
  paymentMethodId: string;
  creatorStripeAccountId: string;
  description: string;
  metadata?: Record<string, string>;
  confirm?: boolean;
}): Promise<Stripe.PaymentIntent> {
  const amountInCents = Math.round(params.amount * 100);
  const platformFeeInCents = Math.round(
    amountInCents * PLATFORM_FEE_PERCENT
  );

  return stripe.paymentIntents.create({
    amount: amountInCents,
    currency: params.currency ?? "usd",
    customer: params.customerId,
    payment_method: params.paymentMethodId,
    description: params.description,
    application_fee_amount: platformFeeInCents,
    transfer_data: {
      destination: params.creatorStripeAccountId,
    },
    metadata: params.metadata ?? {},
    confirm: params.confirm ?? false,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/complete`,
  });
}

// Create subscription for a tier
export async function createSubscription(params: {
  customerId: string;
  stripePriceId: string;
  paymentMethodId: string;
  creatorStripeAccountId: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Subscription> {
  // Attach payment method to customer
  await stripe.paymentMethods.attach(params.paymentMethodId, {
    customer: params.customerId,
  });

  // Set as default
  await stripe.customers.update(params.customerId, {
    invoice_settings: {
      default_payment_method: params.paymentMethodId,
    },
  });

  const platformFeePercent = Math.round(PLATFORM_FEE_PERCENT * 100);

  return stripe.subscriptions.create({
    customer: params.customerId,
    items: [{ price: params.stripePriceId }],
    application_fee_percent: platformFeePercent,
    transfer_data: {
      destination: params.creatorStripeAccountId,
    },
    metadata: params.metadata ?? {},
    expand: ["latest_invoice.payment_intent"],
  });
}

// Cancel subscription
export async function cancelSubscription(
  stripeSubscriptionId: string,
  immediately = false
): Promise<Stripe.Subscription> {
  if (immediately) {
    return stripe.subscriptions.cancel(stripeSubscriptionId);
  }
  return stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
}

// Create Stripe Price for a subscription tier
export async function createOrUpdateStripeTier(params: {
  name: string;
  amount: number; // dollars
  interval: "month" | "year" | "week";
  creatorStripeAccountId: string;
  existingProductId?: string;
  existingPriceId?: string;
}): Promise<{ productId: string; priceId: string }> {
  let productId = params.existingProductId;

  if (!productId) {
    const product = await stripe.products.create(
      {
        name: params.name,
        metadata: { createdBy: "brianxolivia" },
      },
      { stripeAccount: params.creatorStripeAccountId }
    );
    productId = product.id;
  }

  // Archive old price if exists
  if (params.existingPriceId) {
    await stripe.prices.update(
      params.existingPriceId,
      { active: false },
      { stripeAccount: params.creatorStripeAccountId }
    );
  }

  // Create new price
  const price = await stripe.prices.create(
    {
      product: productId,
      unit_amount: Math.round(params.amount * 100),
      currency: "usd",
      recurring: { interval: params.interval },
    },
    { stripeAccount: params.creatorStripeAccountId }
  );

  return { productId, priceId: price.id };
}

// Verify Stripe webhook signature
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
