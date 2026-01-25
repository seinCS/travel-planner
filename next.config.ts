import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 이미지 최적화 설정 (bundle-defer-third-party, rendering-hydration-no-flicker)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000, // 30일 캐싱 (사용자 업로드 이미지 고려)
  },
};

export default nextConfig;
