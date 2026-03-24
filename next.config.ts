import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Firebase Google popup auth-hoz szükséges — az alapértelmezett
          // "same-origin" blokkolja a popup ↔ szülőablak kommunikációt
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ]
  },
  // Firebase Storage képek engedélyezése (majd ha storage bekötésre kerül)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',  // Google profile képek
      },
    ],
  },
}

export default nextConfig
