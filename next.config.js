/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/index.html',
      },
      {
        source: '/admin',
        destination: '/admin.html',
      },
    ];
  },
};

module.exports = nextConfig;
