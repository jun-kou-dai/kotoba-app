import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  // GitHub Pages用: サブディレクトリで配信
  ...(isGitHubPages && {
    basePath: '/kotoba-app',
    assetPrefix: '/kotoba-app',
  }),
  // 静的エクスポート時はImageコンポーネントの最適化を無効化
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
