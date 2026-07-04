import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://indieboost-backend.zhengbijun123.workers.dev/api/:path*",
      },
    ];
  },
};

export default nextConfig;
