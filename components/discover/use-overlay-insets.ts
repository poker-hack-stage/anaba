import { useEffect, useState, type RefObject } from "react";

export type OverlayInsets = { top: number; bottom: number };

const NO_INSETS: OverlayInsets = { top: 0, bottom: 0 };

/** 大きさが変わり続けている間（チップの開閉のアニメーションなど）は、止まるまで待ってから知らせる */
const SETTLE_MS = 150;

/**
 * 地図の枠（`container`）の上端から、上に浮かべた要素（`top`）の下端までの高さと、
 * 枠の下端から、下に浮かべた要素（`bottom`）の上端までの高さ（px）。
 * 「穴場を探す」のスマホで、地図の表示範囲の余白と＋−ボタンの位置に使う（#142）。
 * どちらの要素も `container` を基準に絶対配置していること（offsetTop で測るため）。
 * `enabled` が false のとき（PC）と、ResizeObserver のない環境（テストの jsdom）では 0
 */
export function useOverlayInsets(
  container: RefObject<HTMLElement | null>,
  top: RefObject<HTMLElement | null>,
  bottom: RefObject<HTMLElement | null>,
  enabled: boolean,
): OverlayInsets {
  const [insets, setInsets] = useState<OverlayInsets>(NO_INSETS);

  useEffect(() => {
    const box = container.current;
    const topEl = top.current;
    const bottomEl = bottom.current;
    if (
      !enabled ||
      !box ||
      !topEl ||
      !bottomEl ||
      typeof ResizeObserver === "undefined"
    ) {
      return;
    }
    const measure = () => {
      const next = {
        top: Math.round(topEl.offsetTop + topEl.offsetHeight),
        bottom: Math.round(box.clientHeight - bottomEl.offsetTop),
      };
      setInsets((prev) =>
        prev.top === next.top && prev.bottom === next.bottom ? prev : next,
      );
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(measure, SETTLE_MS);
    });
    observer.observe(box);
    observer.observe(topEl);
    observer.observe(bottomEl);
    measure();
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [container, top, bottom, enabled]);

  return enabled ? insets : NO_INSETS;
}
