"use client";

import { useToast } from "@/hooks/useToast";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle, AlertCircle } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${
              toast.variant === "destructive"
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : "bg-card border-border text-foreground"
            }`}
          >
            {toast.variant === "destructive" ? (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-pink-500" />
            )}
            <div className="flex-1">
              {toast.title && (
                <p className="font-medium text-sm">{toast.title}</p>
              )}
              {toast.description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
