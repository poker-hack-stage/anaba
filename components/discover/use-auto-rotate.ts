import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type PointerEvent,
} from "react";

/** 次の地域へ切り替わるまでの時間 */
const ROTATE_INTERVAL_MS = 6000;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/**
 * 地域の自動切り替え。`count` 件を数秒ごとに順に巡回し、最後まで行くと最初に戻る。
 * 次のときは止まる: マウスを乗せている間（`hoverHandlers` を付けた要素）・
 * キーボードでフォーカスしている間（`focusHandlers` を付けた要素の中が `:focus-visible` のとき）・
 * `paused` が true の間・一時停止ボタン（`togglePaused`）で止めた間・タブを離れている間・件数が1件以下のとき。
 * OS の「視差効果を減らす」（`prefers-reduced-motion`）が有効なら、最初から一時停止にしておく。
 * 一時停止ボタンが `hoverHandlers` の要素の中にあるときは、マウスで「再開」を押しても
 * ポインタを外すまでは動かない（乗せている間は止まる、の仕様どおり）。
 */
export function useAutoRotate(count: number, { paused }: { paused: boolean }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // 一時停止ボタンでの選択。null はまだ押していない（OS の設定に従う）
  const [userPaused, setUserPaused] = useState<boolean | null>(null);

  // サーバーでは「動きを減らさない」「タブは表示中」とみなす
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
  const hidden = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "hidden",
    () => false,
  );

  // 最後にマウスがあった位置と、hoverHandlers を付けた要素
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const hoverTarget = useRef<Element | null>(null);

  // 詳細を閉じたら、その時点のポインタ位置で「乗せている」を判定し直す。ダイアログが消えても
  // pointerleave / pointerenter は来ないため（マウスを動かさないと状態が変わらない）
  useEffect(() => {
    if (paused) return;
    // ダイアログが DOM から消えたあとに判定する
    const id = requestAnimationFrame(() => {
      const p = lastPointer.current;
      const el = p && document.elementFromPoint(p.x, p.y);
      setHovered(!!el && !!hoverTarget.current?.contains(el));
    });
    return () => cancelAnimationFrame(id);
  }, [paused]);

  const isPaused = userPaused ?? reducedMotion;
  const togglePaused = () => setUserPaused(!isPaused);

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = () => setIndex((i) => (i - 1 + count) % count);

  const trackPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    hoverTarget.current = e.currentTarget;
    setHovered(true);
  };

  const stopped =
    hovered || focused || paused || isPaused || hidden || count < 2;
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
    isPaused,
    togglePaused,
    // タッチのタップは「乗せた」に数えない（外をタップするまで止まり続けてしまうため）
    hoverHandlers: {
      onPointerEnter: trackPointer,
      onPointerMove: trackPointer,
      onPointerLeave: () => {
        lastPointer.current = null;
        setHovered(false);
      },
    },
    // 地域が切り替わるとフォーカス中のカードが作り直されてフォーカスが消えるので、キーボード操作中は止める。
    // マウスのクリックやタップでは :focus-visible にならないので、止まり続けることはない
    focusHandlers: {
      onFocus: (e: FocusEvent) =>
        setFocused(e.target.matches(":focus-visible")),
      onBlur: (e: FocusEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      },
    },
  };
}
