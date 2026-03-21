"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/provider";
import { Shield, UserCheck, Loader2 } from "lucide-react";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const promote = trpc.auth.promoteToCreator.useMutation({
    onSuccess: () => {
      setResult({ ok: true, msg: `✓ ${email} is now a creator at /c/${slug}` });
      setEmail(""); setDisplayName(""); setSlug("");
    },
    onError: (err) => setResult({ ok: false, msg: err.message }),
  });

  function handleSlug(val: string) {
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"));
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Admin</h1>
            <p className="text-xs text-muted-foreground">Promote user to creator</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Creator Name"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Profile URL <span className="text-muted-foreground font-normal">— /c/</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => handleSlug(e.target.value)}
              placeholder="creator-name"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            />
          </div>

          {result && (
            <p className={`text-sm px-3 py-2 rounded-lg border ${result.ok ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
              {result.msg}
            </p>
          )}

          <button
            onClick={() => promote.mutate({ email, displayName, slug })}
            disabled={promote.isPending || !email || !displayName || slug.length < 3}
            className="w-full gradient-bg text-white py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {promote.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
            Promote to Creator
          </button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Only admin accounts can access this page.
        </p>
      </div>
    </div>
  );
}
