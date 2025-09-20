import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.webshopapp.com',  // The domain you're allowing
        pathname: '/**',  // Allows all paths from the domain
      },
      {
        protocol: 'https',
        hostname: 'xlrzbfnheqpszgtyhdkh.supabase.co',  // The domain you're allowing
        pathname: '/**',  // Allows all paths from the domain
      },
    ],
  },
};

export default nextConfig;