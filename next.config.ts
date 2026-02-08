import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for GitHub Pages
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',

  // All images unoptimized for static export
  images: {
    unoptimized: true,
  },

  // Optimize for production
  reactStrictMode: true,

  // Disable powered by header
  poweredByHeader: false,
};

export default nextConfig;
