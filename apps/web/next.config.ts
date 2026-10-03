import path from "node:path";
import type { NextConfig } from "next";

const root = path.resolve(process.cwd(), "../..");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Never leak signed download links through the Referer header.
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@invite/shared"],
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingRoot: root,
  turbopack: { root },
  poweredByHeader: false,
  experimental: {
    // Uploads (photos + audio) can exceed the 10 MB default body buffer of proxy.ts.
    proxyClientMaxBodySize: "110mb",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
