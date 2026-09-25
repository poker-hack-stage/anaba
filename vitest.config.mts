import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Next.js 公式ガイド（node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md）に沿った設定。
// ガイドの vite-tsconfig-paths は使わず、Vite 8 に組み込みの resolve.tsconfigPaths で `@/*` を解決する
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // server-only は Server Component の外で読み込むと例外になる（テストはその外で動く）ので、空のモジュールに差し替える
      "server-only": fileURLToPath(
        new URL("./test/mocks/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
