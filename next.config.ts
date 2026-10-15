import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The Docker image runs .next/standalone/server.js with only the traced
  // dependencies, instead of shipping all of node_modules.
  output: "standalone",
};

export default nextConfig;
