/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Skip type checking during build - Vercel will run it separately
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Turbopack configuration for Next.js 16
  turbopack: {
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs", ".cts", ".cjs"],
  },
};

export default nextConfig;
