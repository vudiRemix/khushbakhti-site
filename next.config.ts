import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

// Temporary static copy for GitHub Pages (scripts/build-pages.sh): no admin, no server.
const pages = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  ...(pages ? { output: "export" as const, basePath, trailingSlash: true } : {}),
  images: pages
    ? { loader: "custom", loaderFile: "./src/lib/pages-image-loader.ts" }
    : {
        formats: ["image/avif", "image/webp"],
        remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost }] : [],
      },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
