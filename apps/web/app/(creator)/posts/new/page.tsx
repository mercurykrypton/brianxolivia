"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Eye,
  Lock,
  DollarSign,
  Loader2,
  Image as ImageIcon,
  Video,
  Type,
} from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { createPostSchema, type CreatePostInput } from "@workspace/schemas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MediaUploader } from "@/components/upload/MediaUploader";
import { VideoUploader } from "@/components/upload/VideoUploader";
import { useToast } from "@/hooks/useToast";

type ContentType = "TEXT" | "PHOTO" | "VIDEO" | "BUNDLE";

export default function NewPostPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [contentType, setContentType] = useState<ContentType>("TEXT");
  const [uploadedMedia, setUploadedMedia] = useState<
    Array<{
      type: "IMAGE" | "VIDEO";
      r2Key?: string;
      muxAssetId?: string;
      muxPlaybackId?: string;
      blurHash?: string;
      thumbnailKey?: string;
    }>
  >([]);

  const utils = trpc.useUtils();
  const { data: tiers } = trpc.subscriptions.getTiers.useQuery(
    { creatorProfileId: "" }, // We'll need creator profile ID
    { enabled: false }
  );
  const { data: me } = trpc.auth.me.useQuery();
  const { data: myTiers } = trpc.subscriptions.getTiers.useQuery(
    { creatorProfileId: me?.creatorProfile?.id ?? "" },
    { enabled: !!me?.creatorProfile?.id }
  );

  const createPost = trpc.posts.create.useMutation({
    onSuccess: async (post) => {
      // Attach media
      if (uploadedMedia.length > 0 && me?.creatorProfile) {
        for (let i = 0; i < uploadedMedia.length; i++) {
          const m = uploadedMedia[i]!;
          await addMedia.mutateAsync({
            postId: post.id,
            mediaType: m.type,
            r2Key: m.r2Key,
            muxAssetId: m.muxAssetId,
            muxPlaybackId: m.muxPlaybackId,
            blurHash: m.blurHash,
            thumbnailKey: m.thumbnailKey,
            sortOrder: i,
          });
        }
      }

      utils.posts.getMyPosts.invalidate();
      toast({ title: "Post created!", description: "Your post is live." });
      router.push("/posts");
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addMedia = trpc.posts.addMedia.useMutation();

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<CreatePostInput>({
      resolver: zodResolver(createPostSchema),
      defaultValues: {
        contentType: "TEXT",
        isPaid: false,
        isPublished: true,
      },
    });

  const isPaid = watch("isPaid");
  const isPublished = watch("isPublished");

  const onSubmit = handleSubmit((data) => {
    createPost.mutate({ ...data, contentType });
  });

  const contentTypeOptions = [
    { type: "TEXT" as const, icon: Type, label: "Text" },
    { type: "PHOTO" as const, icon: ImageIcon, label: "Photo" },
    { type: "VIDEO" as const, icon: Video, label: "Video" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/posts"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Create Post</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Content type selector */}
        <div>
          <Label>Content Type</Label>
          <div className="grid grid-cols-3 gap-3 mt-2">
            {contentTypeOptions.map((opt) => (
              <button
                key={opt.type}
                type="button"
                onClick={() => {
                  setContentType(opt.type);
                  setValue("contentType", opt.type);
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  contentType === opt.type
                    ? "border-pink-500 bg-pink-500/10 text-pink-500"
                    : "border-border bg-card text-muted-foreground hover:border-pink-500/50"
                }`}
              >
                <opt.icon className="w-6 h-6" />
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <Label htmlFor="title">Title (optional)</Label>
          <Input
            id="title"
            {...register("title")}
            placeholder="Give your post a title..."
            className="mt-1.5"
          />
        </div>

        {/* Body */}
        <div>
          <Label htmlFor="body">
            {contentType === "TEXT" ? "Content" : "Caption"}
          </Label>
          <textarea
            id="body"
            {...register("body")}
            placeholder={
              contentType === "TEXT"
                ? "Write your post here..."
                : "Add a caption..."
            }
            rows={contentType === "TEXT" ? 8 : 3}
            className="mt-1.5 w-full bg-input border border-border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>

        {/* Media upload */}
        <AnimatePresence>
          {(contentType === "PHOTO" || contentType === "BUNDLE") && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Label>Photos</Label>
              <MediaUploader
                onUpload={(media) =>
                  setUploadedMedia((prev) => [...prev, ...media])
                }
                maxFiles={10}
                className="mt-1.5"
              />
            </motion.div>
          )}

          {contentType === "VIDEO" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Label>Video</Label>
              <VideoUploader
                onUpload={(video) =>
                  setUploadedMedia([
                    {
                      type: "VIDEO",
                      muxAssetId: video.assetId,
                      muxPlaybackId: video.playbackId,
                    },
                  ])
                }
                className="mt-1.5"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Paywall settings */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Access Settings
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Pay Per View</p>
              <p className="text-xs text-muted-foreground">
                Fans pay to unlock this specific post
              </p>
            </div>
            <Switch
              checked={isPaid}
              onCheckedChange={(checked) => setValue("isPaid", checked)}
            />
          </div>

          {isPaid && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
            >
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.99"
                  min="0.99"
                  {...register("price", { valueAsNumber: true })}
                  placeholder="9.99"
                  className="pl-9"
                />
              </div>
            </motion.div>
          )}

          {/* Tier requirement */}
          {myTiers && myTiers.length > 0 && (
            <div>
              <Label className="text-sm">Require Subscription Tier</Label>
              <select
                {...register("requiredTierId")}
                className="mt-1.5 w-full bg-input border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">No tier requirement (free)</option>
                {myTiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name} (${tier.price}/mo)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Publish settings */}
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Publish now</p>
              <p className="text-xs text-muted-foreground">
                {isPublished ? "Will be visible immediately" : "Save as draft"}
              </p>
            </div>
          </div>
          <Switch
            checked={isPublished}
            onCheckedChange={(checked) => setValue("isPublished", checked)}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Link
            href="/posts"
            className="flex-1 py-3 bg-secondary text-foreground rounded-xl font-medium text-center hover:bg-muted transition-colors text-sm"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={createPost.isPending || addMedia.isPending}
            className="flex-1 gradient-bg text-white hover:opacity-90"
          >
            {createPost.isPending || addMedia.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isPublished ? "Publish Post" : "Save Draft"}
          </Button>
        </div>
      </form>
    </div>
  );
}
