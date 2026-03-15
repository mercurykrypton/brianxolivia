"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { X, DollarSign, Loader2, Heart } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { sendTipSchema, type SendTipInput } from "@workspace/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/utils";

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

interface TipModalProps {
  creatorProfileId: string;
  creatorName: string;
  onClose: () => void;
}

export function TipModal({ creatorProfileId, creatorName, onClose }: TipModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: paymentMethods } = trpc.payments.getPaymentMethods.useQuery();
  const sendTip = trpc.tips.send.useMutation({
    onSuccess: () => {
      toast({
        title: "Tip sent!",
        description: `You sent ${creatorName} a tip!`,
      });
      onClose();
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } =
    useForm<Omit<SendTipInput, "creatorProfileId">>({
      resolver: zodResolver(
        sendTipSchema.omit({ creatorProfileId: true, paymentMethodId: true })
      ),
      defaultValues: {
        amount: 10,
        isAnonymous: false,
      },
    });

  const isAnonymous = watch("isAnonymous");
  const amount = watch("amount");

  const onSubmit = handleSubmit((data) => {
    const defaultPM = paymentMethods?.find((pm) => pm.isDefault);
    if (!defaultPM) {
      toast({
        title: "No payment method",
        description: "Add a payment method in settings",
        variant: "destructive",
      });
      return;
    }

    sendTip.mutate({
      creatorProfileId,
      ...data,
      paymentMethodId: defaultPM.stripePaymentMethodId,
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center mx-auto mb-3">
            <Heart className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold">Send a Tip</h2>
          <p className="text-muted-foreground text-sm">Support {creatorName}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Quick amounts */}
          <div>
            <Label>Amount</Label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(a);
                    setValue("amount", a);
                  }}
                  className={`py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedAmount === a || amount === a
                      ? "gradient-bg text-white"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ${a}
                </button>
              ))}
            </div>

            <div className="relative mt-2">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                {...register("amount", { valueAsNumber: true })}
                placeholder="Custom amount"
                className="pl-9"
                min="1"
                step="1"
                onChange={(e) => {
                  setSelectedAmount(null);
                  setValue("amount", parseFloat(e.target.value));
                }}
              />
            </div>
            {errors.amount && (
              <p className="text-destructive text-xs mt-1">{errors.amount.message}</p>
            )}
          </div>

          {/* Message */}
          <div>
            <Label>Message (optional)</Label>
            <textarea
              {...register("message")}
              placeholder="Leave a message..."
              rows={2}
              className="mt-1.5 w-full bg-input border border-border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Anonymous */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Send anonymously</p>
              <p className="text-xs text-muted-foreground">
                Creator won't see your name
              </p>
            </div>
            <Switch
              checked={isAnonymous}
              onCheckedChange={(checked) => setValue("isAnonymous", checked)}
            />
          </div>

          {/* Payment method */}
          {paymentMethods && paymentMethods.length > 0 ? (
            <div className="bg-secondary rounded-xl px-3 py-2.5 text-sm text-muted-foreground">
              Paying with •••• {paymentMethods.find((pm) => pm.isDefault)?.last4 ?? paymentMethods[0]?.last4}
            </div>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-xl p-3 text-sm">
              Add a payment method in Settings to send tips
            </div>
          )}

          <button
            type="submit"
            disabled={sendTip.isPending || !paymentMethods?.length}
            className="w-full gradient-bg text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sendTip.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Heart className="w-5 h-5" />
                Send {amount > 0 ? formatCurrency(amount) : ""} Tip
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
