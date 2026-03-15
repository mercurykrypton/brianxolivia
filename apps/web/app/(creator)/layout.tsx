"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Loader2 } from "lucide-react";

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: me, isLoading } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (!isLoading && me?.role !== "CREATOR") {
      router.push("/feed");
    }
  }, [me, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (me?.role !== "CREATOR") {
    return null;
  }

  return <>{children}</>;
}
