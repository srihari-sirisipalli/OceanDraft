/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
  // Proxy /api/* to the NestJS API so candidate & admin cookies stay on the same origin.
  async rewrites() {
    const apiTarget = process.env.API_BASE_URL ?? 'http://localhost:4000';
    return [
      { source: '/api/:path*', destination: `${apiTarget}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;
