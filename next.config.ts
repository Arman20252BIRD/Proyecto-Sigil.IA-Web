import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(self), geolocation=(), microphone=(), payment=(), usb=()",
      },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      ...(process.env.NODE_ENV === "production"
        ? [
            {
              key: "Strict-Transport-Security",
              value: "max-age=31536000",
            },
            {
              key: "Content-Security-Policy",
              value: [
                "default-src 'self'",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'none'",
                "object-src 'none'",
                "script-src 'self' 'unsafe-inline'",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' https://fonts.gstatic.com",
                "img-src 'self' data: blob:",
                "media-src 'self' blob:",
                "connect-src 'self'",
                "upgrade-insecure-requests",
              ].join("; "),
            },
          ]
        : []),
    ];

    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    const backendUrl = process.env.SIGIL_BACKEND_URL?.trim();

    if (!backendUrl) {
      return [];
    }

    const backend = new URL(backendUrl);

    if (
      !["http:", "https:"].includes(backend.protocol) ||
      backend.pathname !== "/" ||
      backend.search ||
      backend.hash ||
      backend.username ||
      backend.password ||
      (backend.protocol === "http:" &&
        !["localhost", "127.0.0.1", "[::1]"].includes(backend.hostname))
    ) {
      throw new Error(
        "SIGIL_BACKEND_URL must be an HTTP(S) origin without a path, query, or fragment.",
      );
    }

    return {
      beforeFiles: [
        {
          source: "/api/v1/:path*",
          destination: `${backend.origin}/api/v1/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
