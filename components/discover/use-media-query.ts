import { useSyncExternalStore } from "react";

/**
 * 画面の幅がクエリに当たるか。サーバーと、matchMedia のない環境（テストの jsdom）では false
 * （地図はブラウザでだけ描くので困らない）
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () =>
      typeof window.matchMedia === "function" &&
      window.matchMedia(query).matches,
    () => false,
  );
}
