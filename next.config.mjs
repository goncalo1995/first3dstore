/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.7', '192.168.1.11'],
  images: {
    //   unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'public.foto3d.pt',
      },
      {
        protocol: 'https',
        hostname: 'files.golfprint.pt',
      },
      {
        protocol: 'https',
        hostname: 'files.instantdb.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'makerworld.bblmw.com',
      },
      {
        protocol: 'https',
        hostname: 'media.printables.com',
      },
      {
        protocol: 'https',
        hostname: 'i.etsystatic.com',
      },
    ],
  },
}

export default nextConfig
