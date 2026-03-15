"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, CreditCard, Loader2, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/utils";

interface CheckoutModalProps {
  type: "subscription" | "post" | "ppv_message" | "content_request";
  tierId?: string;
  postId?: string;
  messageId?: string;
  amount: number;
  description: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CheckoutModal({
  type,
  tierId,
  postId,
  messageId,
  amount,
  description,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: paymentMethods, isLoading: loadingPM } =
    trpc.payments.getPaymentMethods.useQuery();

  const [selectedPMId, setSelectedPMId] = useState<string | null>(null);

  const defaultPM = paymentMethods?.find((pm) => pm.isDefault);
  const activePM =
    selectedPMId
      ? paymentMethods?.find((pm) => pm.stripePaymentMethodId === selectedPMId)
      : defaultPM ?? paymentMethods?.[0];

  const subscribe = trpc.subscriptions.subscribe.useMutation({
    onSuccess: () => {
      utils.subscriptions.getMySubscriptions.invalidate();
      utils.creator.getBySlug.invalidate();
      toast({ title: "Subscribed!", description: "Welcome to exclusive content." });
      onSuccess();
    },
    onError: (err) => {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    },
  });

  const purchasePost = trpc.posts.purchasePost.useMutation({
    onSuccess: () => {
      utils.posts.getFeed.invalidate();
      utils.posts.getCreatorPosts.invalidate();
      toast({ title: "Unlocked!", description: "Enjoy the content." });
      onSuccess();
    },
    onError: (err) => {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    },
  });

  const unlockPPV = trpc.messages.unlockPPVMessage.useMutation({
    onSuccess: () => {
      toast({ title: "Unlocked!", description: "Message is now viewable." });
      onSuccess();
    },
    onError: (err) => {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    },
  });

  const handleConfirm = () => {
    if (!activePM) {
      toast({
        title: "No payment method",
        description: "Add a card in Settings > Billing",
        variant: "destructive",
      });
      return;
    }

    const pmId = activePM.stripePaymentMethodId;

    if (type === "subscription" && tierId) {
      subscribe.mutate({ tierId, paymentMethodId: pmId });
    } else if (type === "post" && postId) {
      purchasePost.mutate({ postId, paymentMethodId: pmId });
    } else if (type === "ppv_message" && messageId) {
      unlockPPV.mutate({ messageId, paymentMethodId: pmId });
    }
  };

  const isLoading = subscribe.isPending || purchasePost.isPending || unlockPPV.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Confirm Purchase</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        {/* Amount */}
        <div className="bg-secondary rounded-xl p-4 mb-6 text-center">
          <p className="text-muted-foreground text-sm mb-1">Total</p>
          <p className="text-3xl font-bold gradient-text">{formatCurrency(amount)}</p>
          {type === "subscription" && (
            <p className="text-muted-foreground text-xs mt-1">Billed monthly</p>
          )}
        </div>

        {/* Payment method */}
        {loadingPM ? (
          <div className="h-12 shimmer rounded-xl mb-4" />
        ) : !paymentMethods || paymentMethods.length === 0 ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-sm text-yellow-500 mb-4">
            No payment methods saved. Add a card in Settings to continue.
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium">Payment Method</p>
            {paymentMethods.map((pm) => (
              <button
                key={pm.id}
                onClick={() => setSelectedPMId(pm.stripePaymentMethodId)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  (activePM?.stripePaymentMethodId === pm.stripePaymentMethodId)
                    ? "border-pink-500 bg-pink-500/5"
                    : "border-border hover:border-pink-500/30"
                }`}
              >
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm">
                  {pm.brand?.toUpperCase()} •••• {pm.last4}
                </span>
                {pm.isDefault && (
                  <span className="ml-auto text-xs text-muted-foreground">Default</span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-secondary rounded-xl text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !activePM}
            className="flex-1 gradient-bg text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              `Pay ${formatCurrency(amount)}`
            )}
          </button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Secured by Stripe · All transactions are encrypted
        </p>
      </motion.div>
    </div>
  );
}
