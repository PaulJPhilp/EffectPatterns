import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@effect-patterns/toolkit",
    "@effect-patterns/analysis-core",
  ],
  // Mark OpenTelemetry as external to avoid output tracing issues with bun's .bun symlink structure
  serverExternalPackages: [
    "@opentelemetry/api",
    "@opentelemetry/sdk-node",
    "@opentelemetry/sdk-trace-node",
    "@opentelemetry/sdk-trace-base",
    "@opentelemetry/exporter-trace-otlp-http",
    "@opentelemetry/resources",
    "@opentelemetry/semantic-conventions",
  ],
  // Exclude bun's internal module paths from output tracing
  outputFileTracingExcludes: {
    "*": ["node_modules/.bun/**"],
  },
  // Pin monorepo root explicitly to avoid environment-dependent root inference.
  turbopack: {
    root: resolve(__dirname, "../.."),
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },

  /**
   * API versioning: /api/v1/* routes are rewrites to /api/*
   * This allows clients to use either /api/v1/* (recommended)
   * or /api/* (legacy, with deprecation headers)
   */
  async rewrites() {
    return {
      beforeFiles: [
        // Rewrite v1 API paths to current API paths (for forward compatibility)
        {
          source: "/api/v1/:path*",
          destination: "/api/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
