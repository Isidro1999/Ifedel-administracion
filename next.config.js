/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  /**
   * Home V2 promovida: evitar contenido duplicado indexable.
   * HTTP 308 real (mejor para crawlers que el soft-redirect de App Router).
   */
  async redirects() {
    return [
      {
        source: '/catalogo/home-v2',
        destination: '/catalogo',
        permanent: true,
      },
      // Hosts con paths limpios (catalogo.* legacy redirige entero a ifedel.com en middleware).
      {
        source: '/home-v2',
        has: [{ type: 'host', value: 'ifedel.com' }],
        destination: '/',
        permanent: true,
      },
      {
        source: '/home-v2',
        has: [{ type: 'host', value: 'catalogo.localhost' }],
        destination: '/',
        permanent: true,
      },
    ]
  },
  /**
   * En desarrollo, evita que el navegador conserve CSS/JS de un build viejo de `.next`
   * mientras el HTML ya apunta a otro hash (síntoma: página “sin Tailwind”, links violeta).
   */
  async headers() {
    if (process.env.NODE_ENV !== 'development') {
      return []
    }
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, max-age=0',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
