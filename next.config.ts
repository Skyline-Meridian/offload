import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Partial prerendering: cached shell, runtime parts stream inside <Suspense> (see 01 implementation, section 4)
  cacheComponents: true,
  // Small production image for the web container
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  // Native or Node-only packages that must not be bundled
  serverExternalPackages: ['@node-rs/argon2', 'sharp', 'heic-decode', 'ws', 'pg', '@google-cloud/storage'],
  images: {
    formats: ['image/webp'],
    // Uploaded images are served through /media/... redirects to signed URLs
    remotePatterns: [{ protocol: 'https', hostname: 'storage.googleapis.com' }],
  },
  async redirects() {
    return [
      // Old WordPress addresses (see docs/migration, section 15)
      { source: '/universities/:slug', destination: '/colleges-universities/:slug', permanent: true },
      { source: '/universities/:slug/', destination: '/colleges-universities/:slug', permanent: true },
      { source: '/about-us', destination: '/about', permanent: true },
      { source: '/about-us/', destination: '/about', permanent: true },
      { source: '/refund_policy', destination: '/refund-policy', permanent: true },
      { source: '/refund_policy/', destination: '/refund-policy', permanent: true },
      { source: '/forgot-password/', destination: '/forgot-password', permanent: true },
      { source: '/my-account', destination: '/dashboard', permanent: true },
      { source: '/my-account/', destination: '/dashboard', permanent: true },
      { source: '/shop', destination: '/pricing', permanent: true },
      { source: '/shop/', destination: '/pricing', permanent: true },
      { source: '/basket', destination: '/pricing', permanent: true },
      { source: '/basket/', destination: '/pricing', permanent: true },
      { source: '/checkout', destination: '/pricing', permanent: true },
      { source: '/checkout/', destination: '/pricing', permanent: true },
      { source: '/jobs', destination: '/offers', permanent: true },
    ]
  },
}

export default nextConfig
