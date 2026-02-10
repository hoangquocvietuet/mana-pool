import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@mana-pool/sdk"],
};

export default nextConfig;
