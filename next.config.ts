import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "node:sqlite"],
  async headers() {
    return [{ source: "/login", headers: [{ key: "Cache-Control", value: "no-store" }] }];
  },
};

export default nextConfig;
