import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    // Next.js 15 defaults staleTimes.dynamic to 0, meaning the client-side
    // router cache never holds RSC payloads for non-static pages — every
    // tab tap triggers a fresh server round-trip (~1.5s). Setting dynamic=30
    // keeps the payload in the browser cache for 30s so repeat tab switches
    // are instant. The server-side revalidate still controls freshness.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
};

export default withPWA(withNextIntl(nextConfig));
