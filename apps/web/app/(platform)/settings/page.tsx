"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { User, CreditCard, Shield, Bell, Save, Loader2, Camera } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { updateCreatorProfileSchema } from "@workspace/schemas";
import type { UpdateCreatorProfileInput } from "@workspace/schemas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: me, isLoading } = trpc.auth.me.useQuery();
  const updateProfile = trpc.creator.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<UpdateCreatorProfileInput>({
    resolver: zodResolver(updateCreatorProfileSchema),
    values: {
      displayName: me?.creatorProfile?.displayName ?? "",
      bio: me?.creatorProfile?.bio ?? "",
      tags: me?.creatorProfile?.tags ?? [],
      websiteUrl: me?.creatorProfile?.websiteUrl ?? "",
      twitterHandle: me?.creatorProfile?.twitterHandle ?? "",
      instagramHandle: me?.creatorProfile?.instagramHandle ?? "",
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="h-8 w-32 shimmer rounded mb-6" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 shimmer rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary p-1 rounded-xl mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "gradient-bg text-white shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === "profile" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {me?.role === "CREATOR" && me.creatorProfile ? (
            <form
              onSubmit={form.handleSubmit((data) =>
                updateProfile.mutate(data)
              )}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  {...form.register("displayName")}
                  placeholder="Your creator name"
                  className="mt-1.5"
                />
                {form.formState.errors.displayName && (
                  <p className="text-destructive text-xs mt-1">
                    {form.formState.errors.displayName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  {...form.register("bio")}
                  placeholder="Tell fans about yourself..."
                  rows={4}
                  className="mt-1.5 w-full bg-input border border-border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>

              <div>
                <Label htmlFor="websiteUrl">Website</Label>
                <Input
                  id="websiteUrl"
                  {...form.register("websiteUrl")}
                  placeholder="https://yoursite.com"
                  className="mt-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="twitterHandle">Twitter</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      @
                    </span>
                    <Input
                      id="twitterHandle"
                      {...form.register("twitterHandle")}
                      placeholder="username"
                      className="pl-7"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="instagramHandle">Instagram</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      @
                    </span>
                    <Input
                      id="instagramHandle"
                      {...form.register("instagramHandle")}
                      placeholder="username"
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={updateProfile.isPending}
                className="w-full gradient-bg text-white hover:opacity-90"
              >
                {updateProfile.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-sm text-muted-foreground">
                  Email: <span className="text-foreground">{me?.email}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Role: <span className="text-foreground capitalize">{me?.role?.toLowerCase()}</span>
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-sm text-muted-foreground">
                  Display name:{" "}
                  <span className="text-foreground">
                    {me?.fanProfile?.displayName ?? "Not set"}
                  </span>
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Billing tab */}
      {activeTab === "billing" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">Payment Methods</p>
            <p className="text-muted-foreground text-sm">
              Manage your billing at{" "}
              <a href="/settings/billing" className="text-pink-500 hover:underline">
                billing settings
              </a>
            </p>
          </div>
        </motion.div>
      )}

      {/* Security tab */}
      {activeTab === "security" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-card border border-border rounded-xl p-6">
            <Shield className="w-10 h-10 text-pink-500 mb-3" />
            <h3 className="font-semibold mb-2">Account Security</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Your account security is managed by Clerk. Click below to manage
              your password, 2FA, and connected accounts.
            </p>
            <Button
              onClick={() => window.open("https://accounts.clerk.com", "_blank")}
              className="bg-secondary text-foreground hover:bg-muted"
            >
              Manage Security Settings
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
