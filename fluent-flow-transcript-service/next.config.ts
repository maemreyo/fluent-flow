import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Disable router cache to prevent stale page caching
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  turbopack: {
    // Set the root directory for Turbopack
    root: __dirname,
  },
};

export default nextConfig;
