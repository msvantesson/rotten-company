import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {},
  },
  async redirects() {
    return [
      {
        source: "/company/nestl",
        destination: "/company/nestle",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
