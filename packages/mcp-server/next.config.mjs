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
  turbopack: {}, // Enable turbopack with empty config
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
