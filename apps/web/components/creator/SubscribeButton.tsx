"use client";

import { useState } from "react";
import { Heart, HeartOff, Loader2 } from "lucide-react";
import { CheckoutModal } from "@/components/payment/CheckoutModal";

interface SubscribeButtonProps {
  tier: {
    id: string;
    name: string;
    price: number;
  };
  isSubscribed: boolean;
  subscriptionId?: string;
  onSuccess?: () => void;
}

export function SubscribeButton({
  tier,
  isSubscribed,
  subscriptionId,
  onSuccess,
}: SubscribeButtonProps) {
  const [showModal, setShowModal] = useState(false);

  if (isSubscribed) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-pink-500 font-medium">
        <Heart className="w-4 h-4" fill="currentColor" />
        Subscribed
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="gradient-bg text-white px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
      >
        <Heart className="w-4 h-4" />
        Subscribe ${tier.price}/mo
      </button>

      {showModal && (
        <CheckoutModal
          type="subscription"
          tierId={tier.id}
          amount={tier.price}
          description={`${tier.name} subscription`}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            onSuccess?.();
          }}
        />
      )}
    </>
  );
}
