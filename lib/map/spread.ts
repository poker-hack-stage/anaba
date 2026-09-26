/** 画面上の位置（px） */
export type PixelPoint = { x: number; y: number };

/** 押し離しを繰り返す上限。ピンは3件ほどなので、ふつうは数回で収まる */
const MAX_ITERATIONS = 100;
/**
 * 同じ場所の点を押し離す向きを、番号ごとに黄金角（約 137.5 度）ずつ回して決める。
 * 何度描いても同じ向きにずれ、点が増えても向きがそろわない
 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * 中心どうしが minDistance より近い点を、互いに押し離す。点ごとのずらす量（px）を、渡した順で返す。
 * 離れている点はずらさない（0 を返す）。近い2点は、結んだ線の向きに半分ずつ離す
 */
export function spreadApart(
  points: readonly PixelPoint[],
  minDistance: number,
): PixelPoint[] {
  const pos = points.map((p) => ({ x: p.x, y: p.y }));
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let moved = false;
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const distance = Math.hypot(dx, dy);
        if (distance >= minDistance) continue;
        // 同じ場所なら向きが決まらないので、番号で決めた向きに離す
        const angle = GOLDEN_ANGLE * j;
        const [ux, uy] =
          distance > 1e-6
            ? [dx / distance, dy / distance]
            : [Math.cos(angle), Math.sin(angle)];
        // 丸めの誤差で minDistance に届かないまま繰り返さないよう、少しだけ多めに離す
        const push = (minDistance - distance) / 2 + 0.01;
        pos[i].x -= ux * push;
        pos[i].y -= uy * push;
        pos[j].x += ux * push;
        pos[j].y += uy * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return pos.map((p, i) => ({ x: p.x - points[i].x, y: p.y - points[i].y }));
}
