"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap,
  Shield,
  DollarSign,
  MessageCircle,
  Play,
  Star,
  ArrowRight,
  Check,
  Users,
  TrendingUp,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const stats = [
  { value: "50K+", label: "Active Creators" },
  { value: "$2M+", label: "Paid to Creators" },
  { value: "500K+", label: "Subscribers" },
  { value: "80%", label: "Creator Earnings" },
];

const features = [
  {
    icon: DollarSign,
    title: "Keep 80% of Revenue",
    description:
      "One of the highest creator payouts in the industry. We only take 20%.",
    gradient: "from-pink-500 to-pink-700",
  },
  {
    icon: MessageCircle,
    title: "Real-time Messaging",
    description:
      "Direct messaging with fans via Ably-powered real-time chat. Earn from PPV messages.",
    gradient: "from-purple-500 to-purple-700",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description:
      "Content protected with Cloudflare R2 signed URLs. Your real identity stays private.",
    gradient: "from-pink-600 to-purple-600",
  },
  {
    icon: Play,
    title: "Premium Video Streaming",
    description:
      "Mux-powered video with adaptive streaming, signed URLs for paywalled content.",
    gradient: "from-purple-600 to-pink-500",
  },
  {
    icon: Zap,
    title: "Multiple Revenue Streams",
    description:
      "Subscriptions, tips, pay-per-view posts, DMs, and custom content requests.",
    gradient: "from-pink-500 to-purple-500",
  },
  {
    icon: TrendingUp,
    title: "Creator Analytics",
    description:
      "Deep insights into your earnings, subscriber growth, and content performance.",
    gradient: "from-purple-500 to-pink-600",
  },
];

const pricing = [
  {
    name: "Fan",
    price: "Free",
    description: "Browse and discover creators",
    features: [
      "Browse public content",
      "Subscribe to creators",
      "Send tips",
      "Direct messaging (with DM tiers)",
    ],
    cta: "Sign Up Free",
    href: "/sign-up",
    highlighted: false,
  },
  {
    name: "Creator",
    price: "Free to start",
    description: "Platform takes 20% of earnings",
    features: [
      "Unlimited posts & videos",
      "Custom subscription tiers",
      "Real-time DMs",
      "PPV content & messages",
      "Custom content requests",
      "Analytics dashboard",
      "Stripe Connect payouts",
      "Verification badge",
    ],
    cta: "Start Creating",
    href: "/sign-up?role=creator",
    highlighted: true,
  },
];

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-20">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-pink-500/10 blur-[120px]" />
          <div className="absolute -bottom-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-purple-500/10 blur-[120px]" />
        </div>

        <motion.div
          className="relative text-center max-w-4xl mx-auto"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-muted-foreground mb-6"
          >
            <Star className="w-3.5 h-3.5 text-pink-500" fill="currentColor" />
            <span>The premium creator subscription platform</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight"
          >
            Own Your{" "}
            <span className="gradient-text">Content.</span>
            <br />
            Build Your{" "}
            <span className="gradient-text">Empire.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Brivia gives creators the tools to monetize their passion with
            subscriptions, tips, PPV content, and direct fan connections.{" "}
            <strong className="text-foreground">Keep 80% of everything you earn.</strong>
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/sign-up"
              className="gradient-bg text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25"
            >
              Start Creating
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/explore"
              className="bg-white/5 border border-white/10 text-foreground px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-white/10 transition-all duration-200 flex items-center justify-center gap-2"
            >
              Explore Creators
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-16 border-t border-white/10"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold gradient-text mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="gradient-text">Succeed</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Professional tools built for creators who take their work seriously.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="bg-card border border-border rounded-2xl p-6 hover:border-pink-500/30 transition-all duration-300 group"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Start Earning in{" "}
              <span className="gradient-text">3 Steps</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create Your Profile",
                desc: "Set up your pseudonym, bio, and subscription tiers. Your real identity stays private.",
              },
              {
                step: "02",
                title: "Post & Monetize",
                desc: "Upload photos, videos, and text. Set custom prices for PPV content or require a subscription tier.",
              },
              {
                step: "03",
                title: "Get Paid",
                desc: "Earnings go directly to your Stripe Connect account. Weekly payouts, no minimum.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <div className="text-6xl font-bold gradient-text opacity-30 mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Simple, <span className="gradient-text">Transparent</span> Pricing
            </h2>
            <p className="text-muted-foreground text-lg">
              No monthly fees. We only earn when you earn.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pricing.map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`rounded-2xl p-8 ${
                  plan.highlighted
                    ? "gradient-border bg-card relative"
                    : "bg-card border border-border"
                }`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="gradient-bg text-white text-xs px-3 py-1 rounded-full font-medium">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <div className="text-3xl font-bold gradient-text mb-1">
                    {plan.price}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <Check className="w-4 h-4 text-pink-500 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block text-center py-3 rounded-xl font-semibold transition-all duration-200 ${
                    plan.highlighted
                      ? "gradient-bg text-white hover:opacity-90"
                      : "bg-secondary text-foreground hover:bg-muted"
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="gradient-border rounded-3xl p-12 bg-card">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Ready to <span className="gradient-text">Build Your Empire?</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join thousands of creators who are monetizing their content with Brivia.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 gradient-bg text-white px-10 py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-pink-500/25"
            >
              Start for Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-muted-foreground text-sm mt-4">
              No monthly fees. Keep 80% of your earnings.
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
