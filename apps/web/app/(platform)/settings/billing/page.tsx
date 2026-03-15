"use client";

import { motion } from "framer-motion";
import { CreditCard, Plus, Trash2, Check, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";

export default function BillingPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: paymentMethods, isLoading } =
    trpc.payments.getPaymentMethods.useQuery();

  const removeMethod = trpc.payments.removePaymentMethod.useMutation({
    onSuccess: () => {
      utils.payments.getPaymentMethods.invalidate();
      toast({ title: "Payment method removed" });
    },
  });

  const setDefault = trpc.payments.setDefault.useMutation({
    onSuccess: () => {
      utils.payments.getPaymentMethods.invalidate();
      toast({ title: "Default payment method updated" });
    },
  });

  const { data: transactions } = trpc.payments.getTransactions.useQuery({
    limit: 20,
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-8 w-40 shimmer rounded mb-4" />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-16 shimmer rounded-xl" />
        ))}
      </div>
    );
  }

  const brandIcons: Record<string, string> = {
    visa: "💳",
    mastercard: "💳",
    amex: "💳",
    discover: "💳",
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6">
      <h1 className="text-2xl font-bold mb-6">Billing & Payments</h1>

      {/* Payment Methods */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Payment Methods</h2>
          <Button
            size="sm"
            className="gradient-bg text-white hover:opacity-90"
            onClick={() => {
              // In full impl, would open Stripe Elements modal
              toast({ title: "Add payment method", description: "Stripe Elements would open here" });
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Card
          </Button>
        </div>

        {!paymentMethods || paymentMethods.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No payment methods saved. Add a card to subscribe to creators.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((pm) => (
              <motion.div
                key={pm.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 bg-card border border-border rounded-xl p-4"
              >
                <div className="text-2xl">
                  {brandIcons[pm.brand?.toLowerCase() ?? ""] ?? "💳"}
                </div>
                <div className="flex-1">
                  <p className="font-medium capitalize">
                    {pm.brand} •••• {pm.last4}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires {pm.expMonth}/{pm.expYear}
                  </p>
                </div>
                {pm.isDefault && (
                  <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">
                    Default
                  </span>
                )}
                <div className="flex items-center gap-2">
                  {!pm.isDefault && (
                    <button
                      onClick={() =>
                        setDefault.mutate({ paymentMethodId: pm.stripePaymentMethodId })
                      }
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Set default
                    </button>
                  )}
                  <button
                    onClick={() =>
                      removeMethod.mutate({
                        paymentMethodId: pm.stripePaymentMethodId,
                      })
                    }
                    disabled={removeMethod.isPending}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Transaction History */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
        {!transactions?.items.length ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-muted-foreground text-sm">No transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.items.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-xl"
              >
                <div>
                  <p className="text-sm font-medium">{tx.description}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {tx.type.toLowerCase().replace(/_/g, " ")} ·{" "}
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">
                    ${tx.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
