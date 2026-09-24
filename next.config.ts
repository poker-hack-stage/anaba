import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // 開発時に左下に出る Next.js の「N」ボタンを非表示（エラーは引き続き表示される）
  devIndicators: false,
};

export default nextConfig;
