/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  images: { unoptimized: true },
  async redirects() {
    return [
      { source: '/shop', destination: '/products', permanent: true },
      { source: '/register', destination: '/login', permanent: true },
    ];
  },
};
export default nextConfig;
