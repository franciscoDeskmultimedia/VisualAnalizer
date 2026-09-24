import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  // Enable large image payload transfers in API routes if needed
  experimental: {},
};

export default nextConfig;
