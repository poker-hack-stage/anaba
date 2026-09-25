import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// globals を使わない設定なので、Testing Library の自動クリーンアップが効かない。テストごとに手で片付ける
afterEach(() => {
  cleanup();
});
