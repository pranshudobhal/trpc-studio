/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  transpilePackages: ['@trpc-studio/next', '@trpc-studio/core'],
};

module.exports = nextConfig;
