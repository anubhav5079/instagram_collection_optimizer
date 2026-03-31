import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — all pages pre-rendered at build time
  output: "export",

  // Image optimization disabled for static export (images served as-is from CDN)
  images: {
    unoptimized: true,
  },

  // Handle better-sqlite3 native module (Next.js 14+ way)
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
