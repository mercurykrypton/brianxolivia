"use client";

import { useState } from "react";
import { Check, MessageCircle, Crown, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { CheckoutModal } from "@/components/payment/CheckoutModal";

interface TierCardProps {
  tier: {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    interval: string;
    dmAccess: boolean;
    exclusiveContent: boolean;
    requestAccess: boolean;
    color?: string | null;
  };
  creatorProfileId: string;
  isActive?: boolean;
}

export function TierCard({ tier, creatorProfileId, isActive }: TierCardProps) {
  const [showCheckout, setShowCheckout] = useState(false);

  const intervalLabel =
    tier.interval === "MONTHLY"
      ? "month"
      : tier.interval === "ANNUALLY"
      ? "year"
      : "quarter";

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.01 }}
        className={`rounded-2xl border p-5 transition-all duration-200 ${
          isActive
            ? "border-pink-500/50 bg-pink-500/5"
            : "border-border bg-card hover:border-pink-500/30"
        }`}
        style={tier.color ? { borderColor: `${tier.color}30` } : {}}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown
                className="w-4 h-4"
                style={{ color: tier.color ?? "#FF1493" }}
              />
              <h3 className="font-bold">{tier.name}</h3>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold gradient-text">
                {formatCurrency(tier.price)}
              </span>
              <span className="text-muted-foreground text-sm">/{intervalLabel}</span>
            </div>
          </div>

          {!isActive && (
            <button
              onClick={() => setShowCheckout(true)}
              className="gradient-bg text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
            >
              Subscribe
            </button>
          )}

          {isActive && (
            <span className="text-sm text-pink-500 font-medium flex items-center gap-1">
              <Check className="w-4 h-4" />
              Active
            </span>
          )}
        </div>

        {tier.description && (
          <p className="text-sm text-muted-foreground mb-3">{tier.description}</p>
        )}

        {/* Perks */}
        <ul className="space-y-1.5">
          {tier.exclusiveContent && (
            <li className="flex items-center gap-2 text-sm">
              <Check className="w-3.5 h-3.5 text-pink-500 shrink-0" />
              Exclusive content access
            </li>
          )}
          {tier.dmAccess && (
            <li className="flex items-center gap-2 text-sm">
              <MessageCircle className="w-3.5 h-3.5 text-pink-500 shrink-0" />
              Direct messaging access
            </li>
          )}
          {tier.requestAccess && (
            <li className="flex items-center gap-2 text-sm">
              <Zap className="w-3.5 h-3.5 text-pink-500 shrink-0" />
              Content request priority
            </li>
          )}
        </ul>
      </motion.div>

      {showCheckout && (
        <CheckoutModal
          type="subscription"
          tierId={tier.id}
          amount={tier.price}
          description={`${tier.name} subscription`}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => setShowCheckout(false)}
        />
      )}
    </>
  );
}
