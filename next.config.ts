import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import { staticSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: staticSecurityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  tunnelRoute: "/monitoring",
  silent: true,
  // `disableLogger` is deprecated and unsupported under Turbopack, which Next 16
  // uses by default, so it is deliberately not set.
  sourcemaps: { disable: true },
});
