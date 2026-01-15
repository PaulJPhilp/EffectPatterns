/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@effect-patterns/toolkit', '@effect-patterns/analysis-core'],
  turbopack: {}, // Enable turbopack with empty config
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    }
    return config
  },
}

export default nextConfig
