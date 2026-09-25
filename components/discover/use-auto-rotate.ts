import { useCallback, useEffect, useState } from "react";

/** 次の地域へ切り替わるまでの時間 */
const ROTATE_INTERVAL_MS = 6000;

/**
 * 地域の自動切り替え。`count` 件を数秒ごとに順に巡回し、最後まで行くと最初に戻る。
 * マウスを乗せている間（`hoverHandlers` を付けた要素）・`paused` が true の間・件数が1件以下のときは止まる。
 */
export function useAutoRotate(count: number, { paused }: { paused: boolean }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = () => setIndex((i) => (i - 1 + count) % count);

  const stopped = hovered || paused || count < 2;
  useEffect(() => {
    if (stopped) return;
    const id = setTimeout(next, ROTATE_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [index, stopped, next]);

  return {
    index,
    next,
    prev,
    goTo: setIndex,
    hoverHandlers: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
    },
  };
}
