import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@workspace/db", "@workspace/types", "@workspace/schemas"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.cloudflare.com",
      },
      {
        protocol: "https",
        hostname: "media.brivia.com",
      },
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "image.mux.com",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
  typedRoutes: false,
  // Needed for Prisma on Edge
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
