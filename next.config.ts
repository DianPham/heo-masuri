import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  // aggressiveFrontEndNavCaching caused /heo/notebook/today to be served from
  // cache (pre-publish snapshot → TEST_PAGE), so exercises appeared blank
  // until the cache expired. NetworkFirst still caches for offline use.
  aggressiveFrontEndNavCaching: false,
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
      // 0 = Next.js router never serves stale dynamic pages from its client cache.
      // This ensures /heo/notebook/today always refetches when navigated to,
      // so a newly published lesson shows immediately without waiting.
      dynamic: 0,
      static: 300,
    },
  },
};

export default withPWA(withNextIntl(nextConfig));
