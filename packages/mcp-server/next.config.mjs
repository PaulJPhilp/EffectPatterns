/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@effect-patterns/toolkit'],
  turbopack: {}, // Enable turbopack with empty config
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    }
    return config
  },
}

export default nextConfig
