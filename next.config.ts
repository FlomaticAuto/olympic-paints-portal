import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow proxying upstream HTML responses unchanged
  experimental: {
    proxyTimeout: 30_000,
  },
};

export default nextConfig;
