import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { SpotMapProps } from "@/components/map/spot-map";
import type { AreaWithSpots } from "@/lib/data/areas";
import type { Spot } from "@/lib/data/spots";
import { AreaMap } from "./area-map";

// 地図（MapLibre）は jsdom では描けないので、next/dynamic が返す部品の代わりに、渡された props と作り直しの回数を記録する
const map = vi.hoisted(() => ({
  props: [] as SpotMapProps[],
  mounts: 0,
}));

vi.mock("next/dynamic", async () => {
  const { useEffect } = await import("react");
  return {
    default: () =>
      function FakeSpotMap(props: SpotMapProps) {
        map.props.push(props);
        useEffect(() => {
          map.mounts += 1;
        }, []);
        return null;
      },
  };
});

const polygon = {
  type: "Polygon",
  coordinates: [
    [
      [137.8, 36.6],
      [137.9, 36.6],
      [137.9, 36.7],
      [137.8, 36.6],
    ],
  ],
};

function spot(id: string): Spot {
  return { id, name: id, lat: 36.65, lng: 137.85 } as Spot;
}

function area(id: string, boundary: unknown): AreaWithSpots {
  const spots = [spot(`${id}-1`), spot(`${id}-2`), spot(`${id}-3`)];
  return {
    id,
    name: id,
    boundary,
    spots: [...spots, spot(`${id}-other`)],
    recommended: spots,
  } as AreaWithSpots;
}

function lastProps() {
  return map.props[map.props.length - 1];
}

beforeEach(() => {
  map.props = [];
  map.mounts = 0;
});

describe("AreaMap（#14）", () => {
  test("境界とおすすめを渡し、なめらかに移動させる", () => {
    const hakuba = area("hakuba", polygon);
    render(<AreaMap area={hakuba} onSpotClick={() => {}} />);

    const props = lastProps();
    expect(props.boundary).toBe(polygon);
    expect(props.highlighted).toBe(hakuba.recommended);
    expect(props.animateMove).toBe(true);
    expect(props.others?.map((s) => s.id)).toEqual(["hakuba-other"]);
  });

  test("地域が変わっても地図を作り直さない", () => {
    const { rerender } = render(
      <AreaMap area={area("hakuba", polygon)} onSpotClick={() => {}} />,
    );
    rerender(<AreaMap area={area("omachi", polygon)} onSpotClick={() => {}} />);

    expect(map.mounts).toBe(1);
    expect(lastProps().areaName).toBe("omachi");
  });

  test("読めない境界は渡さない", () => {
    render(
      <AreaMap
        area={area("hakuba", { type: "Polygon", coordinates: "broken" })}
        onSpotClick={() => {}}
      />,
    );
    expect(lastProps().boundary).toBeNull();
  });

  test("地域がない（絞り込みで0件）ときは境界もピンも渡さない", () => {
    render(<AreaMap onSpotClick={() => {}} />);
    const props = lastProps();
    expect(props.boundary).toBeNull();
    expect(props.highlighted).toBeUndefined();
    expect(props.emptyPlaceholder).toBe(false);
  });

  test("絞り込み中は、条件に合うスポットだけを小さな点で渡す（A-07）", () => {
    const hakuba = area("hakuba", polygon);
    const matched = { ...hakuba, matchedSpots: hakuba.recommended };
    render(<AreaMap area={matched} onSpotClick={() => {}} />);
    expect(lastProps().others).toEqual([]);
  });

  test("地域がない（絞り込みで0件）ときは、全地域の中心が入る範囲を出す（K-6）", () => {
    const all = [
      { ...area("hakuba", polygon), center_lng: 137.86, center_lat: 36.7 },
      { ...area("takeda", polygon), center_lng: 131.4, center_lat: 32.98 },
    ];
    render(<AreaMap allAreas={all} onSpotClick={() => {}} />);
    expect(lastProps().fitPoints).toEqual([
      [137.86, 36.7],
      [131.4, 32.98],
    ]);
  });

  test("地域があるときは、全地域の範囲を渡さない", () => {
    render(
      <AreaMap
        area={area("hakuba", polygon)}
        allAreas={[area("takeda", polygon)]}
        onSpotClick={() => {}}
      />,
    );
    expect(lastProps().fitPoints).toBeUndefined();
  });
});

/** 画面の幅を決める（useMediaQuery は matchMedia で読む）。`pc` なら lg・xl に当たる */
function stubScreen(pc: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: pc,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

describe("AreaMap のスマホの全面表示（#142）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("スマホでは、表示中のカードのスポットを目立たせ、浮かべた検索欄・パネルの高さだけ表示範囲の上下を空ける", () => {
    stubScreen(false);
    render(
      <AreaMap
        area={area("hakuba", polygon)}
        overlayInsets={{ top: 64, bottom: 300 }}
        activeSpotId="hakuba-2"
        onSpotClick={() => {}}
      />,
    );
    const props = lastProps();
    expect(props.activeSpotId).toBe("hakuba-2");
    expect(props.fitPadding).toEqual({
      top: 80,
      right: 24,
      bottom: 316,
      left: 24,
    });
    // ＋−ボタンと帰属表示は、下のパネルの上に持ち上げる
    expect(props.style).toEqual({ "--map-controls-bottom": "300px" });
    // 地域名はパネルに出るので、地図のバッジは出さない
    expect(props.labelClassName).toMatch(/\bmax-lg:hidden\b/);
  });

  test("スマホでも、パネルの高さを測る前は既定の余白のまま", () => {
    stubScreen(false);
    render(
      <AreaMap
        area={area("hakuba", polygon)}
        overlayInsets={{ top: 0, bottom: 0 }}
        onSpotClick={() => {}}
      />,
    );
    expect(lastProps().fitPadding).toBeUndefined();
  });

  test("PC では目立たせるピンも、スマホの余白も渡さない（見た目を変えない）", () => {
    stubScreen(true);
    render(
      <AreaMap
        area={area("hakuba", polygon)}
        overlayInsets={{ top: 64, bottom: 300 }}
        activeSpotId="hakuba-2"
        onSpotClick={() => {}}
      />,
    );
    const props = lastProps();
    expect(props.activeSpotId).toBeUndefined();
    expect(props.fitPadding).toEqual({
      top: 40,
      right: 420 + 40,
      bottom: 64,
      left: 340 + 40,
    });
    expect(props.style).toBeUndefined();
  });
});
