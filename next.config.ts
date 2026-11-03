import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "node:sqlite"],
  experimental: {
    staleTimes: { dynamic: 30, static: 180 },
  },
  async headers() {
    return [{ source: "/login", headers: [{ key: "Cache-Control", value: "no-store" }] }];
  },
};

export default nextConfig;
