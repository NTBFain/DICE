import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
 
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.182.65.4', 'localhost', '127.0.0.1', '*.trycloudflare.com'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      {
        protocol: 'http',
        hostname: '10.182.65.4',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://127.0.0.1:8000/uploads/:path*',
      },
      {
        source: '/ws',
        destination: 'http://127.0.0.1:8000/ws',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/artists',
        destination: '/',
        permanent: false,
      },
      {
        source: '/:locale(en|th)/artists',
        destination: '/:locale',
        permanent: false,
      },
      {
        source: '/admin',
        destination: '/dashboard/admin',
        permanent: false,
      },
      {
        source: '/:locale(en|th)/admin',
        destination: '/:locale/dashboard/admin',
        permanent: false,
      },
      {
        source: '/artist',
        destination: '/dashboard/artist',
        permanent: false,
      },
      {
        source: '/:locale(en|th)/artist',
        destination: '/:locale/dashboard/artist',
        permanent: false,
      },
      {
        source: '/client',
        destination: '/dashboard/client',
        permanent: false,
      },
      {
        source: '/:locale(en|th)/client',
        destination: '/:locale/dashboard/client',
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
