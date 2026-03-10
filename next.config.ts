import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // 静的エクスポート時はImageコンポーネントの最適化を無効化
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
