/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@effect-patterns/components'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
