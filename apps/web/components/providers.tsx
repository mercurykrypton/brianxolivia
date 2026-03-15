"use client";

import { TRPCProvider } from "@/lib/trpc/provider";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      {children}
      <Toaster />
    </TRPCProvider>
  );
}
