/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable experimental features if needed
  },
  transpilePackages: [
    '@trpc-studio/core',
    '@trpc-studio/ui',
    '@trpc-studio/next',
  ],
};

export default nextConfig;
