"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, ArrowRight, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";

export default function OnboardingPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  const onboard = trpc.auth.onboardFan.useMutation({
    onSuccess: () => {
      router.push("/feed");
    },
    onError: (err) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      setError("Display name must be at least 2 characters.");
      return;
    }
    onboard.mutate({ displayName: trimmed });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-pink-500/10 blur-[120px]" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="px-2.5 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-sm tracking-tight">BxO</span>
            </div>
            <span className="text-2xl font-bold gradient-text">brianXolivia</span>
          </div>

          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-pink-500/25">
              <Heart className="w-8 h-8 text-white" fill="currentColor" />
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-2">Welcome aboard! 🎉</h1>
          <p className="text-muted-foreground text-sm">
            Just one quick step — choose a display name to get started.
          </p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium mb-2"
              >
                Your display name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex, superfan99…"
                maxLength={50}
                autoFocus
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                This is how you&apos;ll appear to us. You can change it later in settings.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={onboard.isPending || displayName.trim().length < 2}
              className="w-full gradient-bg text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-500/20"
            >
              {onboard.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up…
                </>
              ) : (
                <>
                  Go to my feed
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing you agree to our{" "}
          <a href="/terms" className="underline hover:text-foreground transition-colors">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline hover:text-foreground transition-colors">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
