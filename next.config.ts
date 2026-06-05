import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const basePath = isGitHubPages ? '/kotoba-app' : '';

const nextConfig: NextConfig = {
  output: 'export',
  // GitHub Pages用: サブディレクトリで配信
  ...(isGitHubPages && {
    basePath: '/kotoba-app',
    assetPrefix: '/kotoba-app',
  }),
  // 同梱音声(public/audio)のパス解決用にクライアントへ basePath を渡す
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  // 静的エクスポート時はImageコンポーネントの最適化を無効化
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
